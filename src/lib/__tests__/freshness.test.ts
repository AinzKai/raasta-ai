import { describe, expect, it } from "vitest";
import {
  ForbiddenError,
  GovernanceError,
  approveCandidate,
  applyOverlayToFees,
  buildHistory,
  displayStatus,
  entitiesForSource,
  findConflicts,
  flagForInvestigation,
  isAllowed,
  isDue,
  monitoredSources,
  monitoredStatus,
  parseRobots,
  planApproval,
  rejectCandidate,
  resolveActive,
  rollbackPublishedVersion,
  runMonitor,
  sourceFreshness,
  userFreshness,
  validateProposals,
  type AuditEntry,
  type ChangeCandidate,
  type GovernanceStore,
  type KnowledgeVersion,
  type MonitorDeps,
  type MonitorStore,
  type PublishedVersion,
  type SourceState,
} from "../freshness";
import { buildDashboard } from "../freshness/dashboard";
import { FEES } from "../knowledge";
import {
  assessChange,
  factTokens,
  looksBlocked,
  normalizeContent,
  sha256Hex,
} from "../source-change";
import { buildJourney, emptyJourneyInput, EMPTY_STATE } from "../journey";
import { routerCatalogue } from "../grounding";

const FEE = "cnic.federal.fee.renewal-normal";
const T0 = new Date("2026-10-09T03:00:00Z");
const ADMIN = "admin-1";

// ------------------------------------------------------------------ in-memory store ----

class Mem implements MonitorStore, GovernanceStore {
  admins = new Set<string>([ADMIN]);
  states = new Map<string, SourceState>();
  snapshots = new Map<string, { hash: string; text: string }>();
  checks: Array<Record<string, unknown>> = [];
  candidates = new Map<string, ChangeCandidate>();
  versions: Array<KnowledgeVersion & { id: string }> = [];
  conflicts: Array<{ entityId: string; field: string; a: unknown; b: unknown }> = [];
  auditLog: AuditEntry[] = [];
  runs: Array<{ status: string }> = [];
  failInsertVersion = false;
  seq = 0;

  isAdmin = async (id: string) => this.admins.has(id);
  getSourceState = async (id: string) => this.states.get(id) ?? null;
  saveSourceState = async (s: SourceState) => void this.states.set(s.sourceId, s);
  latestSnapshot = async (id: string) => this.snapshots.get(id) ?? null;
  saveCheck = async (row: Record<string, unknown>) => {
    this.checks.push(row);
    return `check-${this.checks.length}`;
  };
  saveSnapshot = async (id: string, _c: string, hash: string, text: string) =>
    void this.snapshots.set(id, { hash, text });
  publishedVersions = async (): Promise<PublishedVersion[]> =>
    this.versions
      .filter((v) => v.status === "published")
      .map((v) => ({
        entityId: v.entityId,
        field: v.field,
        version: v.version,
        value: v.value,
        effectiveFrom: v.effectiveFrom,
        effectiveUntil: v.effectiveUntil,
        createdAt: v.createdAt,
        approvedAt: v.approvedAt,
        sourceId: v.sourceId,
      }));
  openCandidates = async () =>
    [...this.candidates.values()].filter(
      (c) => c.status === "pending" || c.status === "needs-investigation",
    );
  saveCandidate = async (c: ChangeCandidate) => void this.candidates.set(c.id, c);
  saveConflict = async (c: { entityId: string; field: string; a: unknown; b: unknown }) =>
    void this.conflicts.push(c);
  openConflictKeys = async () => new Set<string>();
  audit = async (e: AuditEntry) => void this.auditLog.push(e);
  startRun = async () => "run";
  finishRun = async (_id: string, status: string) => void this.runs.push({ status });
  getCandidate = async (id: string) => this.candidates.get(id) ?? null;
  claimCandidate = async (id: string, from: string[], patch: Record<string, unknown>) => {
    const c = this.candidates.get(id);
    if (!c || !from.includes(c.status)) return null;
    const next = {
      ...c,
      status: patch["status"] as ChangeCandidate["status"],
      reviewedBy: patch["reviewed_by"] as string,
      reviewedAt: patch["reviewed_at"] as string,
      reviewNote: (patch["review_note"] as string | null) ?? null,
      effectiveFrom:
        patch["effective_from"] !== undefined
          ? (patch["effective_from"] as string | null)
          : c.effectiveFrom,
    };
    this.candidates.set(id, next);
    return next;
  };
  setCandidateStatus = async (id: string, status: string) =>
    void this.candidates.set(id, {
      ...this.candidates.get(id)!,
      status: status as ChangeCandidate["status"],
    });
  versionsFor = async (entityId: string) => this.versions.filter((v) => v.entityId === entityId);
  getVersion = async (id: string) => this.versions.find((v) => v.id === id) ?? null;
  insertVersion = async (v: Omit<KnowledgeVersion, "id">) => {
    if (this.failInsertVersion) throw new Error("db error");
    if (this.versions.some((x) => x.entityId === v.entityId && x.version === v.version))
      throw new Error("duplicate version");
    const row = { ...v, id: `v${++this.seq}` };
    this.versions.push(row);
    return row;
  };
  rollbackVersion = async (
    id: string,
    patch: {
      status: "rolled-back";
      rolledBackAt: string;
      rolledBackBy: string;
      rollbackReason: string;
    },
  ) => {
    const v = this.versions.find((x) => x.id === id);
    if (!v || v.status !== "published") return false;
    Object.assign(v, patch);
    return true;
  };
  clearReviewFlagIfResolved = async () => {};
}

const page = (amount: number, extra = "") =>
  `<html><head><title>x</title><script>track(${Math.random()})</script></head><body><nav>Home About</nav><h1>NADRA fee structure</h1>
   <p>The following fees apply to national identity card services. Please read the schedule carefully before applying at a registration centre.
   Fees are published by the authority and are subject to revision. Applicants should keep their receipt until the card is delivered.</p>
   <table><tr><td>CNIC renewal — Normal</td><td>PKR ${amount}</td></tr><tr><td>CNIC renewal — Urgent</td><td>PKR 1,150</td></tr></table>${extra}
   <footer>Visitors: ${Math.floor(Math.random() * 9999)} © 2026</footer></body></html>`;

function deps(
  store: Mem,
  html: () => string,
  over: Partial<MonitorDeps> = {},
  extractOut: () => unknown = () => null,
): MonitorDeps {
  return {
    store,
    fetchPage: async () => ({
      ok: true,
      status: 200,
      text: html(),
      contentType: "text/html",
      finalUrl: "https://x",
    }),
    fetchRobots: async () => null,
    extract: async () => extractOut(),
    now: () => T0,
    sleep: async () => {},
    newId: () => `cand-${++store.seq}`,
    delayMs: 0,
    retries: 0,
    ...over,
  };
}
const proposal600 = () => ({
  proposals: [
    {
      entityId: FEE,
      field: "amount",
      proposedValue: 600,
      evidenceQuote: "CNIC renewal — Normal PKR 600",
      effectiveFrom: null,
      confidence: 0.94,
    },
  ],
});
const only = { force: true, onlySourceIds: ["nadra.fee-structure"] };

// ------------------------------------------------------------------------ pure parts ----

describe("normalization, hashing, change detection", () => {
  it("ignores scripts, navigation, counters and copyright years", () => {
    expect(normalizeContent(page(400))).toBe(normalizeContent(page(400)));
  });
  it("still sees a real fee change", async () => {
    const a = normalizeContent(page(400));
    const b = normalizeContent(page(600));
    expect(await sha256Hex(a)).not.toBe(await sha256Hex(b));
    const r = assessChange({
      reachable: true,
      previousHash: "a",
      currentHash: "b",
      previousText: a,
      currentText: b,
    });
    expect(r).toMatchObject({
      contentChanged: true,
      meaningful: true,
      addedFacts: ["600"],
      removedFacts: ["400"],
      reviewRequired: true,
    });
  });
  it("unchanged hash is not a change; unreachable needs review but is not a change", () => {
    expect(assessChange({ reachable: true, previousHash: "a", currentHash: "a" })).toMatchObject({
      contentChanged: false,
      meaningful: false,
      reviewRequired: false,
    });
    expect(assessChange({ reachable: false, previousHash: "a", currentHash: null })).toMatchObject({
      contentChanged: false,
      reviewRequired: true,
    });
  });
  it("cosmetic wording-only churn without new figures is not meaningful when mostly the same", () => {
    const a = normalizeContent(page(400));
    const b = normalizeContent(page(400, "<p>x</p>"));
    expect(
      assessChange({
        reachable: true,
        previousHash: "a",
        currentHash: "b",
        previousText: a,
        currentText: b,
      }).meaningful,
    ).toBe(false);
  });
  it("detects bot-protection and error pages without trying to work around them", () => {
    expect(looksBlocked(normalizeContent("<html>Just a moment...</html>"))).toBe(true);
    expect(looksBlocked(normalizeContent(page(400)))).toBe(false);
    expect([...factTokens("fee 1,150 in 12 days, 5 items")].sort()).toEqual(["1150", "12"]);
  });
});

describe("robots.txt and monitoring policy", () => {
  it("honours Disallow, with Allow overriding by specificity", () => {
    const r = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/public\n");
    expect(isAllowed(r, "/private/x")).toBe(false);
    expect(isAllowed(r, "/private/public/x")).toBe(true);
    expect(isAllowed(r, "/fees")).toBe(true);
    expect(isAllowed(parseRobots("User-agent: *\nDisallow: /"), "/anything")).toBe(false);
    expect(isAllowed(parseRobots("User-agent: other\nDisallow: /"), "/x")).toBe(true);
  });
  it("only registered sources are monitored; phone numbers are manual", () => {
    const list = monitoredSources();
    expect(list.every((s) => /^(https:\/\/|tel:)/.test(s.record.url))).toBe(true);
    expect(list.find((s) => s.record.id === "nadra.helpline")!.monitoring).toBe("manual");
    expect(list.find((s) => s.record.id === "nadra.fee-structure")).toMatchObject({
      frequency: "daily",
      monitoring: "auto",
    });
  });
  it("respects each source's frequency", () => {
    expect(isDue("daily", "2026-10-08T03:00:00Z", T0)).toBe(true);
    expect(isDue("daily", "2026-10-09T01:00:00Z", T0)).toBe(false);
    expect(isDue("weekly", "2026-10-05T03:00:00Z", T0)).toBe(false);
    expect(isDue("manual", null, T0)).toBe(false);
    expect(isDue("daily", null, T0)).toBe(true);
  });
  it("reachable, fresh, stale and unreachable are distinct", () => {
    const base: SourceState = {
      sourceId: "s",
      lastCheckedAt: null,
      lastSuccessAt: "2026-10-08T00:00:00Z",
      lastVerifiedAt: null,
      lastChangedAt: null,
      lastContentHash: null,
      lastHttpStatus: 200,
      consecutiveFailures: 0,
      reviewRequired: false,
      manualOnly: false,
      manualReason: null,
    };
    expect(sourceFreshness(base, "daily", T0)).toBe("fresh");
    expect(sourceFreshness({ ...base, lastSuccessAt: "2026-09-20T00:00:00Z" }, "daily", T0)).toBe(
      "very-stale",
    );
    expect(monitoredStatus({ ...base, lastSuccessAt: "2026-10-01T00:00:00Z" }, "daily", T0)).toBe(
      "stale",
    );
    expect(monitoredStatus({ ...base, consecutiveFailures: 3 }, "daily", T0)).toBe("unreachable");
    // reachable and fresh but never human-verified is NOT "verified"
    expect(monitoredStatus(base, "daily", T0)).toBe("needs-review");
    expect(monitoredStatus({ ...base, lastVerifiedAt: "2026-10-08T00:00:00Z" }, "daily", T0)).toBe(
      "verified",
    );
  });
  it("user-facing age: unknown stays unknown, old asks for confirmation", () => {
    expect(userFreshness(null, T0)).toEqual({ daysAgo: null, level: "unknown" });
    expect(userFreshness("2026-10-07", T0)).toMatchObject({ daysAgo: 2, level: "ok" });
    expect(userFreshness("2026-06-01", T0).level).toBe("confirm");
  });
});

describe("AI-proposed changes are validated against the real page", () => {
  const entities = entitiesForSource("nadra.fee-structure", [], T0);
  const text = normalizeContent(page(600));
  it("accepts a proposal whose quote is verbatim on the page and contains the amount", () => {
    const r = validateProposals(proposal600(), { entities, pageText: text });
    expect(r.rejected).toEqual([]);
    expect(r.accepted[0]).toMatchObject({ entityId: FEE, proposedValue: 600, oldValue: 400 });
  });
  it.each([
    [
      "a fabricated quote",
      { evidenceQuote: "CNIC renewal normal now costs PKR 600 per the new rules" },
    ],
    ["a quote that omits the amount", { evidenceQuote: "CNIC renewal — Normal" }],
    ["an unknown entity", { entityId: "made.up.fee" }],
    [
      "a value equal to the trusted one",
      { proposedValue: 400, evidenceQuote: "CNIC renewal — Normal PKR 400" },
    ],
    ["a non-integer amount", { proposedValue: 600.5 }],
    ["an extra field", { sneaky: true }],
  ])("rejects %s", (_n, patch) => {
    const r = validateProposals(
      { proposals: [{ ...proposal600().proposals[0], ...patch }] },
      { entities, pageText: text },
    );
    expect(r.accepted).toHaveLength(0);
    expect(r.rejected).toHaveLength(1);
  });
  it("rejects output that is not the expected shape", () => {
    expect(validateProposals("lol", { entities, pageText: text }).accepted).toEqual([]);
  });
});

// -------------------------------------------------------------------- version resolution ----

const v = (
  version: number,
  value: number,
  effectiveFrom: string | null,
  status: "published" | "rolled-back" = "published",
) => ({
  version,
  value,
  effectiveFrom,
  effectiveUntil: null,
  createdAt: "2026-10-09T00:00:00Z",
  approvedAt: "2026-10-09T00:00:00Z",
  status,
});

describe("version resolution and effective dates", () => {
  it("seed is version 1 until something is approved", () => {
    expect(resolveActive(400, [], T0)).toMatchObject({ value: 400, version: 1, source: "seed" });
  });
  it("a version with no effective date is active from publication", () => {
    expect(resolveActive(400, [v(2, 600, null)], T0)).toMatchObject({
      value: 600,
      version: 2,
      source: "published",
    });
  });
  it("FUTURE-DATED: current 400, upcoming 600 effective 1 Nov 2026", () => {
    const versions = [v(2, 600, "2026-11-01T00:00:00Z")];
    const before = resolveActive(400, versions, new Date("2026-10-31T23:59:59Z"));
    expect(before).toMatchObject({ value: 400, version: 1 });
    expect(before.upcoming?.value).toBe(600);
    const after = resolveActive(400, versions, new Date("2026-11-01T00:00:00Z"));
    expect(after).toMatchObject({ value: 600, version: 2 });
    expect(after.upcoming).toBeNull(); // no code change or job is needed when the date arrives
  });
  it("a rolled-back version never applies, and the previous one is restored", () => {
    expect(resolveActive(400, [v(2, 600, null), v(3, 700, null, "rolled-back")], T0)).toMatchObject(
      { value: 600, version: 2 },
    );
    expect(resolveActive(400, [v(2, 600, null, "rolled-back")], T0)).toMatchObject({
      value: 400,
      version: 1,
    });
  });
  it("overlay changes only the approved fee and only when effective", () => {
    const pv: PublishedVersion = {
      entityId: FEE,
      field: "amount",
      version: 2,
      value: 600,
      effectiveFrom: "2026-11-01T00:00:00Z",
      effectiveUntil: null,
      createdAt: "2026-10-09T00:00:00Z",
      approvedAt: "2026-10-09T00:00:00Z",
      sourceId: "nadra.fee-structure",
    };
    const get = (d: Date) => applyOverlayToFees(FEES, [pv], d).find((f) => f.id === FEE)!;
    expect(get(T0)).toMatchObject({ amount: 400, upcoming: { amount: 600 } });
    const after = get(new Date("2026-11-02"));
    expect(after).toMatchObject({
      amount: 600,
      activeVersion: 2,
      verificationStatus: "verified",
      lastVerifiedAt: "2026-10-09",
    });
    expect(
      applyOverlayToFees(FEES, [pv], T0).find((f) => f.id === "cnic.federal.fee.renewal-urgent")!
        .amount,
    ).toBe(1150);
  });
  it("history keeps every version, including rolled-back ones", () => {
    const rows = buildHistory(
      400,
      "2026-08-30",
      [
        {
          ...(v(2, 600, null) as object),
          id: "a",
          entityType: "fee",
          entityId: FEE,
          field: "amount",
          sourceId: "s",
          candidateId: null,
          approvedBy: "x",
          rolledBackAt: null,
          rolledBackBy: null,
          rollbackReason: null,
        } as unknown as KnowledgeVersion,
      ],
      T0,
    );
    expect(rows.map((r) => [r.version, r.status])).toEqual([
      [2, "active"],
      [1, "superseded"],
    ]);
  });
});

describe("conflicts", () => {
  const cand = (id: string, src: string, value: number): ChangeCandidate => ({
    id,
    kind: "value_change",
    sourceId: src,
    serviceId: "cnic",
    entityId: FEE,
    jurisdictionId: "federal",
    field: "amount",
    oldValue: 400,
    proposedValue: value,
    detectedAt: "x",
    confidence: 0.9,
    sourceEvidence: { quote: null, url: "", addedFacts: [], removedFacts: [], textHash: null },
    status: "pending",
    extraction: "ai",
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    effectiveFrom: null,
    effectiveUntil: null,
  });
  it("two sources proposing different values are a conflict, never an auto-pick", () => {
    expect(findConflicts([cand("1", "a", 600), cand("2", "b", 500)])).toHaveLength(1);
    expect(findConflicts([cand("1", "a", 600), cand("2", "b", 600)])).toHaveLength(0);
    expect(findConflicts([cand("1", "a", 600), cand("2", "a", 500)])).toHaveLength(0);
  });
});

// --------------------------------------------------------------------- monitoring flow ----

describe("source monitoring", () => {
  it("first read baselines the page; a changed official page creates a PENDING candidate and trusted knowledge is untouched", async () => {
    const store = new Mem();
    let amount = 400;
    const d = deps(
      store,
      () => page(amount),
      {},
      () => ({ proposals: [] }),
    );
    await runMonitor(d, only);
    expect(store.candidates.size).toBe(0);
    expect(store.states.get("nadra.fee-structure")).toMatchObject({
      consecutiveFailures: 0,
      lastContentHash: expect.any(String),
    });

    amount = 600;
    const d2 = deps(store, () => page(amount), {}, proposal600);
    const summary = await runMonitor(d2, only);
    expect(summary).toMatchObject({ changed: 1, candidatesCreated: 1 });
    const [c] = [...store.candidates.values()];
    expect(c).toMatchObject({
      kind: "value_change",
      entityId: FEE,
      oldValue: 400,
      proposedValue: 600,
      status: "pending",
      extraction: "ai",
      sourceId: "nadra.fee-structure",
    });
    expect(c!.sourceEvidence.addedFacts).toContain("600");
    // nothing was published
    expect(store.versions).toHaveLength(0);
    expect(
      applyOverlayToFees(FEES, await store.publishedVersions(), T0).find((f) => f.id === FEE)!
        .amount,
    ).toBe(400);
    expect(store.auditLog.map((a) => a.action)).toContain("candidate_created");
  });
  it("is idempotent: the same change does not create duplicate candidates", async () => {
    const store = new Mem();
    let amount = 400;
    await runMonitor(
      deps(
        store,
        () => page(amount),
        {},
        () => ({ proposals: [] }),
      ),
      only,
    );
    amount = 600;
    await runMonitor(
      deps(store, () => page(amount), {}, proposal600),
      only,
    );
    amount = 600;
    await runMonitor(
      deps(
        store,
        () => page(amount, "<p>Note about the delivery of cards by courier service.</p>"),
        {},
        proposal600,
      ),
      only,
    );
    expect([...store.candidates.values()].filter((c) => c.kind === "value_change")).toHaveLength(1);
  });
  it("with no AI available, a meaningful change still becomes a candidate for a human to investigate", async () => {
    const store = new Mem();
    let amount = 400;
    await runMonitor(
      deps(store, () => page(amount)),
      only,
    );
    amount = 600;
    await runMonitor(
      deps(store, () => page(amount)),
      only,
    );
    const [c] = [...store.candidates.values()];
    expect(c).toMatchObject({ kind: "source_change", extraction: "none", proposedValue: null });
    expect(c!.sourceEvidence.addedFacts).toContain("600");
  });
  it("an AI proposal with fabricated evidence is discarded, leaving a page-level candidate", async () => {
    const store = new Mem();
    let amount = 400;
    await runMonitor(
      deps(store, () => page(amount)),
      only,
    );
    amount = 600;
    await runMonitor(
      deps(
        store,
        () => page(amount),
        {},
        () => ({
          proposals: [
            {
              ...proposal600().proposals[0],
              evidenceQuote: "invented text that is not on the page PKR 600",
            },
          ],
        }),
      ),
      only,
    );
    expect([...store.candidates.values()].map((c) => c.kind)).toEqual(["source_change"]);
  });
  it("unreachable source: no candidate, no knowledge change, failures counted, review flag after 3", async () => {
    const store = new Mem();
    const down = deps(store, () => "", {
      fetchPage: async () => ({ ok: false, status: 503, error: "http_503", retryable: true }),
    });
    for (let i = 0; i < 3; i++) await runMonitor(down, only);
    expect(store.candidates.size).toBe(0);
    expect(store.versions).toHaveLength(0);
    expect(store.states.get("nadra.fee-structure")).toMatchObject({
      consecutiveFailures: 3,
      reviewRequired: true,
      lastSuccessAt: null,
    });
    expect(monitoredStatus(store.states.get("nadra.fee-structure")!, "daily", T0)).toBe(
      "unreachable",
    );
  });
  it("retries transient errors politely, but not 403s", async () => {
    const store = new Mem();
    let calls = 0;
    await runMonitor(
      deps(store, () => "", {
        retries: 2,
        fetchPage: async () => {
          calls++;
          return { ok: false, status: 503, error: "http_503", retryable: true };
        },
      }),
      only,
    );
    expect(calls).toBe(3);
    calls = 0;
    await runMonitor(
      deps(store, () => "", {
        retries: 2,
        fetchPage: async () => {
          calls++;
          return { ok: false, status: 403, error: "http_403", retryable: false };
        },
      }),
      only,
    );
    expect(calls).toBe(1);
  });
  it("a bot-protection page counts as a failure, not as content", async () => {
    const store = new Mem();
    await runMonitor(
      deps(store, () => "<html><body>Just a moment... enable javascript</body></html>"),
      only,
    );
    expect(store.snapshots.size).toBe(0);
    expect(store.checks[0]).toMatchObject({
      status: "error",
      error: "blocked_or_unreadable_content",
    });
  });
  it("robots.txt disallow makes the source MANUAL; it is not fetched", async () => {
    const store = new Mem();
    let fetched = 0;
    await runMonitor(
      deps(store, () => page(400), {
        fetchRobots: async () => "User-agent: *\nDisallow: /",
        fetchPage: async () => {
          fetched++;
          return { ok: true, status: 200, text: page(400), contentType: "text/html", finalUrl: "" };
        },
      }),
      only,
    );
    expect(fetched).toBe(0);
    expect(store.states.get("nadra.fee-structure")).toMatchObject({
      manualOnly: true,
      manualReason: "robots.txt disallows automated access",
    });
    expect(store.checks[0]).toMatchObject({ status: "skipped" });
  });
  it("respects frequency: a source checked an hour ago is skipped unless forced", async () => {
    const store = new Mem();
    await runMonitor(
      deps(store, () => page(400)),
      { onlySourceIds: ["nadra.fee-structure"], force: true },
    );
    const before = store.checks.length;
    await runMonitor(
      deps(store, () => page(400)),
      { onlySourceIds: ["nadra.fee-structure"] },
    );
    expect(store.checks.length).toBe(before);
  });
  it("monitored facts use the CURRENT trusted amount (approved versions), never pending proposals", async () => {
    expect(
      entitiesForSource("nadra.fee-structure", [], T0).find((e) => e.entityId === FEE)!
        .currentAmount,
    ).toBe(400);
    const pv: PublishedVersion = {
      entityId: FEE,
      field: "amount",
      version: 2,
      value: 600,
      effectiveFrom: null,
      effectiveUntil: null,
      createdAt: "2026-10-01T00:00:00Z",
      approvedAt: "2026-10-01T00:00:00Z",
      sourceId: "nadra.fee-structure",
    };
    expect(
      entitiesForSource("nadra.fee-structure", [pv], T0).find((e) => e.entityId === FEE)!
        .currentAmount,
    ).toBe(600);
  });
  it("dashboard separates reachable, stale, unreachable and manual", async () => {
    const store = new Mem();
    await runMonitor(
      deps(store, () => page(400)),
      only,
    );
    const rows = [...store.states.values()].map((s) => ({
      id: s.sourceId,
      last_checked_at: s.lastCheckedAt,
      last_success_at: s.lastSuccessAt,
      last_verified_at: s.lastVerifiedAt,
      last_changed_at: s.lastChangedAt,
      last_content_hash: s.lastContentHash,
      last_http_status: s.lastHttpStatus,
      consecutive_failures: s.consecutiveFailures,
      review_required: s.reviewRequired,
      manual_only: s.manualOnly,
      manual_reason: s.manualReason,
    }));
    const d = buildDashboard(
      rows,
      [
        { started_at: "2026-10-09T03:00:00Z", finished_at: "2026-10-09T03:01:00Z", status: "ok" },
        {
          started_at: "2026-10-10T03:00:00Z",
          finished_at: "2026-10-10T03:01:00Z",
          status: "partial",
        },
      ],
      [],
      T0,
    );
    expect(d.counts.monitored).toBe(monitoredSources().length);
    expect(d.counts.healthy).toBe(1);
    expect(d.counts.manual).toBeGreaterThan(0);
    expect(d.lastRun?.status).toBe("partial");
    expect(d.lastSuccessfulRun?.at).toBe("2026-10-09T03:01:00Z");
  });
});

// ------------------------------------------------------------ governance: the 400 → 600 story ----

async function seededCandidate(store: Mem, over: Partial<ChangeCandidate> = {}) {
  let amount = 400;
  await runMonitor(
    deps(
      store,
      () => page(amount),
      {},
      () => ({ proposals: [] }),
    ),
    only,
  );
  amount = 600;
  await runMonitor(
    deps(store, () => page(amount), {}, proposal600),
    only,
  );
  const c = [...store.candidates.values()].find((x) => x.kind === "value_change")!;
  if (Object.keys(over).length) store.candidates.set(c.id, { ...c, ...over });
  return store.candidates.get(c.id)!;
}
const activeFee = async (store: Mem, now: Date) =>
  applyOverlayToFees(FEES, await store.publishedVersions(), now).find((f) => f.id === FEE)!;

describe("400 → 600: detect, review, approve, version, roll back", () => {
  it("runs the whole scenario", async () => {
    const store = new Mem();
    // 1-3: candidate exists, pending, old value still active
    const c = await seededCandidate(store);
    expect(c.status).toBe("pending");
    expect((await activeFee(store, T0)).amount).toBe(400);
    // 4: normal users still get 400 through a journey
    const j = buildJourney(
      emptyJourneyInput("cnic", "federal", { situation: "renew" }),
      EMPTY_STATE,
      { versions: await store.publishedVersions(), now: T0 },
    );
    expect(j.fees.shown.find((f) => f.id === FEE)!.amount).toBe(400);
    // 5: the admin can inspect it — candidate carries evidence and values
    expect(c.sourceEvidence.quote).toMatch(/pkr 600/);
    // 6-7: approve → new version
    const res = await approveCandidate(store, {
      adminId: ADMIN,
      candidateId: c.id,
      now: T0,
      note: "Confirmed against the current official NADRA fee structure.",
    });
    expect(res.version).toMatchObject({
      version: 2,
      value: 600,
      status: "published",
      approvedBy: ADMIN,
      candidateId: c.id,
      sourceId: "nadra.fee-structure",
    });
    expect(res.scheduled).toBe(false);
    // 8: old version remains in history
    const history = buildHistory(400, null, await store.versionsFor(FEE), T0);
    expect(history.map((h) => [h.version, h.value])).toEqual([
      [2, 600],
      [1, 400],
    ]);
    // 9: new version is active; users now see 600
    expect((await activeFee(store, T0)).amount).toBe(600);
    const j2 = buildJourney(
      emptyJourneyInput("cnic", "federal", { situation: "renew" }),
      EMPTY_STATE,
      { versions: await store.publishedVersions(), now: T0 },
    );
    expect(j2.fees.shown.find((f) => f.id === FEE)).toMatchObject({
      amount: 600,
      verificationStatus: "verified",
    });
    // 10: audit trail answers "why is Raasta showing PKR 600?"
    const audit = store.auditLog.map((a) => a.action);
    expect(audit).toEqual(
      expect.arrayContaining(["candidate_created", "candidate_approved", "version_published"]),
    );
    const pub = store.auditLog.find((a) => a.action === "version_published")!;
    expect(pub).toMatchObject({
      actor: ADMIN,
      actorKind: "admin",
      entityId: FEE,
      versionId: res.version.id,
      details: { version: 2, previousValue: 400, newValue: 600 },
    });
    expect(store.candidates.get(c.id)).toMatchObject({
      status: "published",
      reviewedBy: ADMIN,
      reviewNote: expect.stringContaining("Confirmed"),
    });
    // 11: rollback restores 400, history is preserved
    const restored = await rollbackPublishedVersion(store, {
      adminId: ADMIN,
      versionId: res.version.id,
      reason: "Source corrected the notice",
      now: T0,
    });
    expect(restored).toEqual({ value: 400, version: 1 });
    expect((await activeFee(store, T0)).amount).toBe(400);
    expect(store.versions).toHaveLength(1);
    expect(store.versions[0]).toMatchObject({
      status: "rolled-back",
      rolledBackBy: ADMIN,
      rollbackReason: "Source corrected the notice",
    });
    expect(store.candidates.get(c.id)!.status).toBe("rolled-back");
    expect(store.auditLog.at(-1)).toMatchObject({
      action: "version_rolled_back",
      details: { rolledBackVersion: 2, restoredValue: 400, reason: "Source corrected the notice" },
    });
  });

  it("future-dated approval: users keep 400 until 1 Nov, then get 600 with no deploy", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    const res = await approveCandidate(store, {
      adminId: ADMIN,
      candidateId: c.id,
      now: T0,
      effectiveFrom: "2026-11-01T00:00:00Z",
    });
    expect(res.scheduled).toBe(true);
    expect(store.candidates.get(c.id)!.status).toBe("scheduled");
    const before = await activeFee(store, new Date("2026-10-31T12:00:00Z"));
    expect(before).toMatchObject({ amount: 400, upcoming: { amount: 600 } });
    const after = await activeFee(store, new Date("2026-11-01T00:00:01Z"));
    expect(after.amount).toBe(600);
    expect(displayStatus(store.candidates.get(c.id)!, new Date("2026-11-02"))).toBe("published");
    expect(displayStatus(store.candidates.get(c.id)!, T0)).toBe("scheduled");
    expect(store.auditLog.find((a) => a.action === "version_published")!.details).toMatchObject({
      effectiveDateKnown: true,
      activeFromPublication: false,
    });
  });

  it("an unknown effective date is recorded as unknown, not invented", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    await approveCandidate(store, { adminId: ADMIN, candidateId: c.id, now: T0 });
    expect(store.versions[0]!.effectiveFrom).toBeNull();
    expect(store.auditLog.find((a) => a.action === "version_published")!.details).toMatchObject({
      effectiveDateKnown: false,
      activeFromPublication: true,
    });
  });

  it("rejection preserves the candidate and evidence, records the reviewer, and changes nothing", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    await rejectCandidate(store, {
      adminId: ADMIN,
      candidateId: c.id,
      now: T0,
      note: "Third-party page, not official",
    });
    expect(store.candidates.get(c.id)).toMatchObject({
      status: "rejected",
      reviewedBy: ADMIN,
      reviewNote: "Third-party page, not official",
    });
    expect(store.candidates.get(c.id)!.sourceEvidence.quote).toBeTruthy();
    expect(store.versions).toHaveLength(0);
    expect((await activeFee(store, T0)).amount).toBe(400);
    await expect(
      approveCandidate(store, { adminId: ADMIN, candidateId: c.id, now: T0 }),
    ).rejects.toBeInstanceOf(GovernanceError);
  });

  it("can be flagged for investigation, then approved or rejected later", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    await flagForInvestigation(store, {
      adminId: ADMIN,
      candidateId: c.id,
      now: T0,
      note: "Need to call NADRA",
    });
    expect(store.candidates.get(c.id)!.status).toBe("needs-investigation");
    expect((await activeFee(store, T0)).amount).toBe(400);
    await approveCandidate(store, { adminId: ADMIN, candidateId: c.id, now: T0 });
    expect((await activeFee(store, T0)).amount).toBe(600);
  });

  it("only one reviewer can win a concurrent decision", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    const [a, b] = await Promise.allSettled([
      approveCandidate(store, { adminId: ADMIN, candidateId: c.id, now: T0 }),
      rejectCandidate(store, { adminId: ADMIN, candidateId: c.id, now: T0 }),
    ]);
    expect([a.status, b.status].sort()).toEqual(["fulfilled", "rejected"]);
  });

  it("a failed version write does not leave a half-approved candidate", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    store.failInsertVersion = true;
    await expect(
      approveCandidate(store, { adminId: ADMIN, candidateId: c.id, now: T0 }),
    ).rejects.toThrow("db error");
    expect(store.candidates.get(c.id)!.status).toBe("pending");
    expect(store.versions).toHaveLength(0);
  });

  it("refuses to approve over a trusted value that has since changed", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    store.versions.push({
      id: "x",
      entityType: "fee",
      entityId: FEE,
      field: "amount",
      version: 2,
      value: 500,
      status: "published",
      effectiveFrom: null,
      effectiveUntil: null,
      sourceId: "s",
      candidateId: null,
      createdAt: "2026-10-01T00:00:00Z",
      approvedBy: "a",
      approvedAt: "2026-10-01T00:00:00Z",
      rolledBackAt: null,
      rolledBackBy: null,
      rollbackReason: null,
    });
    await expect(
      approveCandidate(store, { adminId: ADMIN, candidateId: c.id, now: T0 }),
    ).rejects.toMatchObject({ code: "base_changed" });
  });

  it("refuses incomplete candidates, unknown entities and bad dates", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    expect(() =>
      planApproval({
        candidate: { ...c, kind: "source_change", proposedValue: null },
        existing: [],
        seedFee: FEES.find((f) => f.id === FEE),
        reviewerId: ADMIN,
        now: T0,
      }),
    ).toThrow(/complete amount change/);
    expect(() =>
      planApproval({ candidate: c, existing: [], seedFee: undefined, reviewerId: ADMIN, now: T0 }),
    ).toThrow(/Unknown/);
    expect(() =>
      planApproval({
        candidate: c,
        existing: [],
        seedFee: FEES.find((f) => f.id === FEE),
        reviewerId: ADMIN,
        now: T0,
        effectiveFrom: "not a date",
      }),
    ).toThrow(/valid date/);
  });

  it("rollback needs a reason and a published version; a version cannot be rolled back twice", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    const { version } = await approveCandidate(store, {
      adminId: ADMIN,
      candidateId: c.id,
      now: T0,
    });
    await expect(
      rollbackPublishedVersion(store, {
        adminId: ADMIN,
        versionId: version.id,
        reason: " ",
        now: T0,
      }),
    ).rejects.toMatchObject({ code: "reason_required" });
    await rollbackPublishedVersion(store, {
      adminId: ADMIN,
      versionId: version.id,
      reason: "wrong source",
      now: T0,
    });
    await expect(
      rollbackPublishedVersion(store, {
        adminId: ADMIN,
        versionId: version.id,
        reason: "again",
        now: T0,
      }),
    ).rejects.toMatchObject({ code: "bad_state" });
  });

  it("development fixtures cannot be approved unless explicitly allowed", async () => {
    const store = new Mem();
    const c = await seededCandidate(store, { extraction: "fixture" });
    await expect(
      approveCandidate(store, { adminId: ADMIN, candidateId: c.id, now: T0 }),
    ).rejects.toThrow(/fixtures/i);
    await expect(
      approveCandidate(store, { adminId: ADMIN, candidateId: c.id, now: T0, allowFixtures: true }),
    ).resolves.toBeTruthy();
  });
});

describe("admin authorization (server-side)", () => {
  it("a normal user cannot approve, reject, flag or roll back anything", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    for (const user of ["normal-user", "", "undefined"]) {
      await expect(
        approveCandidate(store, { adminId: user, candidateId: c.id, now: T0 }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      await expect(
        rejectCandidate(store, { adminId: user, candidateId: c.id, now: T0 }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      await expect(
        flagForInvestigation(store, { adminId: user, candidateId: c.id, now: T0 }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      await expect(
        rollbackPublishedVersion(store, {
          adminId: user,
          versionId: "v1",
          reason: "nope",
          now: T0,
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect(store.candidates.get(c.id)!.status).toBe("pending");
    expect(store.versions).toHaveLength(0);
  });
  it("admin status is read from the database on every call: removing an admin takes effect immediately", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    store.admins.delete(ADMIN);
    await expect(
      approveCandidate(store, { adminId: ADMIN, candidateId: c.id, now: T0 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("the public AI only ever sees active, approved knowledge", () => {
  it("the router catalogue contains no fee values at all, so pending/rejected proposals cannot reach the model", async () => {
    const store = new Mem();
    await seededCandidate(store);
    expect(routerCatalogue()).not.toMatch(/600|proposed|pending/i);
  });
  it("rolled-back and pending data never overlay trusted fees", async () => {
    const store = new Mem();
    const c = await seededCandidate(store);
    expect(await store.publishedVersions()).toEqual([]);
    const { version } = await approveCandidate(store, {
      adminId: ADMIN,
      candidateId: c.id,
      now: T0,
    });
    await rollbackPublishedVersion(store, {
      adminId: ADMIN,
      versionId: version.id,
      reason: "test",
      now: T0,
    });
    expect(await store.publishedVersions()).toEqual([]);
  });
});
