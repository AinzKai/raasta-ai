import { FEES, type FeeRecord } from "../knowledge";
import { applyOverlayToFees } from "./versions";
import { assessChange, looksBlocked, normalizeContent, sha256Hex } from "../source-change";
import { findConflicts, type DetectedConflict } from "./conflicts";
import {
  extractionSystemPrompt,
  extractionUserMessage,
  sourceChangeCandidate,
  validateProposals,
  valueCandidate,
  type MonitoredEntity,
} from "./extract";
import { isDue, monitoredSources, type MonitoredSource } from "./policy";
import { isAllowed, parseRobots } from "./robots";
import type { AuditEntry, ChangeCandidate, PublishedVersion, SourceState } from "./types";

/**
 * Source monitoring orchestration.
 *
 * Automatic:  fetch registered sources, record health, hash content, detect
 *             meaningful change, create REVIEW CANDIDATES.
 * Never:      change trusted knowledge. Candidates are proposals only.
 *
 * All I/O is injected so this logic is testable without a network or database.
 */

export type FetchResult =
  | { ok: true; status: number; text: string; contentType: string; finalUrl: string }
  | { ok: false; status: number | null; error: string; timedOut?: boolean; retryable: boolean };

export type CheckRow = {
  sourceId: string;
  url: string;
  status: "ok" | "error" | "timeout" | "skipped";
  httpStatus: number | null;
  error: string | null;
  contentHash: string | null;
  contentChanged: boolean;
  reviewRequired: boolean;
  skippedReason: string | null;
  finalUrl: string | null;
  contentLength: number | null;
  agencyId: string;
  jurisdictionId: string;
};

export interface MonitorStore {
  getSourceState(sourceId: string): Promise<SourceState | null>;
  saveSourceState(state: SourceState, source: MonitoredSource): Promise<void>;
  latestSnapshot(sourceId: string): Promise<{ hash: string; text: string } | null>;
  saveCheck(row: CheckRow): Promise<string>;
  saveSnapshot(sourceId: string, checkId: string, hash: string, text: string): Promise<void>;
  publishedVersions(): Promise<PublishedVersion[]>;
  openCandidates(): Promise<ChangeCandidate[]>;
  saveCandidate(c: ChangeCandidate): Promise<void>;
  saveConflict(c: DetectedConflict): Promise<void>;
  openConflictKeys(): Promise<Set<string>>;
  audit(entry: AuditEntry): Promise<void>;
  startRun(): Promise<string>;
  finishRun(
    id: string,
    status: "ok" | "partial" | "failed",
    summary: Record<string, unknown>,
  ): Promise<void>;
}

export type MonitorDeps = {
  store: MonitorStore;
  fetchPage: (url: string) => Promise<FetchResult>;
  /** robots.txt body, or null if it could not be read. */
  fetchRobots: (origin: string) => Promise<string | null>;
  /** Returns the model's parsed JSON, or null when no model is available. */
  extract: (system: string, user: string) => Promise<unknown | null>;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
  newId: () => string;
  /** Polite spacing between sources. */
  delayMs?: number;
  retries?: number;
};

export type MonitorSummary = {
  checked: number;
  skipped: number;
  failed: number;
  changed: number;
  candidatesCreated: number;
  conflictsOpened: number;
  sourceIds: { failed: string[]; changed: string[]; manual: string[] };
};

const emptyState = (sourceId: string): SourceState => ({
  sourceId,
  lastCheckedAt: null,
  lastSuccessAt: null,
  lastVerifiedAt: null,
  lastChangedAt: null,
  lastContentHash: null,
  lastHttpStatus: null,
  consecutiveFailures: 0,
  reviewRequired: false,
  manualOnly: false,
  manualReason: null,
});

/** Monitored facts for a source, at their CURRENT trusted amounts (seed + approved versions only). */
export function entitiesForSource(
  sourceId: string,
  versions: PublishedVersion[],
  now: Date,
): MonitoredEntity[] {
  const fees: FeeRecord[] = applyOverlayToFees(
    FEES.filter((f) => f.sourceId === sourceId && !f.historical && f.amount !== null),
    versions,
    now,
  );
  return fees.map((f) => ({
    entityId: f.id,
    serviceId: f.serviceId,
    jurisdictionId: f.jurisdictionId,
    label: f.label.en,
    currentAmount: f.amount as number,
  }));
}

async function fetchWithRetry(deps: MonitorDeps, url: string): Promise<FetchResult> {
  const retries = deps.retries ?? 2;
  let last: FetchResult = { ok: false, status: null, error: "not attempted", retryable: false };
  for (let attempt = 0; attempt <= retries; attempt++) {
    last = await deps.fetchPage(url);
    if (last.ok || !last.retryable) return last;
    if (attempt < retries) await deps.sleep(1000 * (attempt + 1) * (attempt + 1));
  }
  return last;
}

export async function runMonitor(
  deps: MonitorDeps,
  opts: { force?: boolean; onlySourceIds?: string[] } = {},
): Promise<MonitorSummary> {
  const { store } = deps;
  const summary: MonitorSummary = {
    checked: 0,
    skipped: 0,
    failed: 0,
    changed: 0,
    candidatesCreated: 0,
    conflictsOpened: 0,
    sourceIds: { failed: [], changed: [], manual: [] },
  };
  const runId = await store.startRun();
  const robotsCache = new Map<string, ReturnType<typeof parseRobots> | null>();
  const versions = await store.publishedVersions();

  for (const source of monitoredSources()) {
    if (opts.onlySourceIds && !opts.onlySourceIds.includes(source.record.id)) continue;
    const now = deps.now();
    const state = (await store.getSourceState(source.record.id)) ?? emptyState(source.record.id);
    const base = {
      sourceId: source.record.id,
      url: source.record.url,
      agencyId: source.record.agencyId,
      jurisdictionId: source.record.jurisdictionId,
    };

    // ---- Sources we may not (or cannot) fetch automatically --------------------------------
    if (source.monitoring === "manual") {
      const reason = source.record.url.startsWith("tel:")
        ? "phone number — verify by calling"
        : "manual verification required";
      await store.saveSourceState({ ...state, manualOnly: true, manualReason: reason }, source);
      summary.skipped++;
      summary.sourceIds.manual.push(source.record.id);
      continue;
    }
    if (!opts.force && !isDue(source.frequency, state.lastCheckedAt, now)) {
      summary.skipped++;
      continue;
    }

    const url = new URL(source.record.url);
    if (!robotsCache.has(url.origin)) {
      const body = await deps.fetchRobots(url.origin);
      robotsCache.set(url.origin, body === null ? null : parseRobots(body));
    }
    const robots = robotsCache.get(url.origin);
    if (robots && !isAllowed(robots, url.pathname + url.search)) {
      const reason = "robots.txt disallows automated access";
      await store.saveCheck({
        ...base,
        status: "skipped",
        httpStatus: null,
        error: null,
        contentHash: null,
        contentChanged: false,
        reviewRequired: true,
        skippedReason: reason,
        finalUrl: null,
        contentLength: null,
      });
      await store.saveSourceState(
        {
          ...state,
          lastCheckedAt: now.toISOString(),
          manualOnly: true,
          manualReason: reason,
          reviewRequired: true,
        },
        source,
      );
      await store.audit({
        at: now.toISOString(),
        actor: null,
        actorKind: "system",
        action: "source_flagged",
        entityId: null,
        candidateId: null,
        versionId: null,
        details: { sourceId: source.record.id, reason },
      });
      summary.skipped++;
      summary.sourceIds.manual.push(source.record.id);
      continue;
    }

    // ---- Fetch -----------------------------------------------------------------------------------
    summary.checked++;
    const res = await fetchWithRetry(deps, source.record.url);
    let failure: string | null = null;
    let normalized = "";
    let hash: string | null = null;
    // Non-HTML files (e.g. a .doc form) are compared by a hash of their bytes, supplied by the fetcher.
    const opaque = res.ok && !/text\/(html|plain)/i.test(res.contentType);
    if (!res.ok) failure = res.error;
    else {
      normalized = opaque ? res.text : normalizeContent(res.text);
      // Bot-protection and error pages are never "content". We do not try to get around them.
      if (!opaque && looksBlocked(normalized)) failure = "blocked_or_unreadable_content";
      else hash = await sha256Hex(normalized);
    }

    if (failure || !hash || !res.ok) {
      // A failed check never makes a fact wrong and never touches trusted knowledge.
      const failures = state.consecutiveFailures + 1;
      const timedOut = !res.ok && res.timedOut === true;
      await store.saveCheck({
        ...base,
        status: timedOut ? "timeout" : "error",
        httpStatus: res.ok ? res.status : res.status,
        error: failure,
        contentHash: null,
        contentChanged: false,
        reviewRequired: failures >= 3,
        skippedReason: null,
        finalUrl: null,
        contentLength: null,
      });
      await store.saveSourceState(
        {
          ...state,
          lastCheckedAt: now.toISOString(),
          lastHttpStatus: res.ok ? res.status : res.status,
          consecutiveFailures: failures,
          reviewRequired: state.reviewRequired || failures >= 3,
        },
        source,
      );
      summary.failed++;
      summary.sourceIds.failed.push(source.record.id);
      await deps.sleep(deps.delayMs ?? 1500);
      continue;
    }

    // ---- Change detection ------------------------------------------------------------------------
    const prev = await store.latestSnapshot(source.record.id);
    const assessment = assessChange({
      reachable: true,
      previousHash: prev?.hash ?? null,
      currentHash: hash,
      previousText: prev?.text ?? null,
      currentText: normalized,
    });
    const firstRead = prev === null;
    // A changed binary file cannot be diffed by facts, so any change is treated as meaningful.
    const meaningful = assessment.meaningful || (opaque && assessment.contentChanged);
    const checkId = await store.saveCheck({
      ...base,
      status: "ok",
      httpStatus: res.status,
      error: null,
      contentHash: hash,
      contentChanged: assessment.contentChanged,
      reviewRequired: meaningful,
      skippedReason: null,
      finalUrl: res.finalUrl,
      contentLength: normalized.length,
    });
    if (firstRead || assessment.contentChanged)
      await store.saveSnapshot(source.record.id, checkId, hash, normalized);

    let reviewRequired = state.reviewRequired && !state.manualOnly ? state.reviewRequired : false;
    if (meaningful) {
      summary.changed++;
      summary.sourceIds.changed.push(source.record.id);
      reviewRequired = true;
    }

    // ---- Candidates: only when something meaningful changed, or on first read of a source with monitored facts ----
    const entities = entitiesForSource(source.record.id, versions, now);
    if (meaningful || (firstRead && entities.length > 0 && !opaque)) {
      const detectedAt = now.toISOString();
      const draft = {
        sourceId: source.record.id,
        sourceUrl: source.record.url,
        detectedAt,
        textHash: hash,
        addedFacts: assessment.addedFacts.slice(0, 40),
        removedFacts: assessment.removedFacts.slice(0, 40),
      };
      const open = await store.openCandidates();
      const created: ChangeCandidate[] = [];

      if (entities.length > 0) {
        const raw = await deps.extract(
          extractionSystemPrompt(),
          extractionUserMessage(entities, normalized),
        );
        if (raw !== null) {
          const checked = validateProposals(raw, { entities, pageText: normalized });
          for (const p of checked.accepted) {
            const dup = open.some(
              (c) =>
                c.kind === "value_change" &&
                c.entityId === p.entityId &&
                c.proposedValue === p.proposedValue &&
                c.sourceId === source.record.id,
            );
            if (dup) continue;
            created.push(valueCandidate(p, { ...draft, id: deps.newId() }, "ai"));
          }
        }
      }
      // A meaningful change with no validated proposal still needs a human to look.
      if (created.length === 0 && meaningful) {
        const dup = open.some(
          (c) =>
            c.kind === "source_change" &&
            c.sourceId === source.record.id &&
            c.sourceEvidence.textHash === hash,
        );
        if (!dup) created.push(sourceChangeCandidate({ ...draft, id: deps.newId() }));
      }
      for (const c of created) {
        await store.saveCandidate(c);
        await store.audit({
          at: detectedAt,
          actor: null,
          actorKind: "system",
          action: "candidate_created",
          entityId: c.entityId,
          candidateId: c.id,
          versionId: null,
          details: {
            kind: c.kind,
            sourceId: c.sourceId,
            oldValue: c.oldValue,
            proposedValue: c.proposedValue,
            extraction: c.extraction,
            confidence: c.confidence,
          },
        });
        summary.candidatesCreated++;
        if (c.kind === "value_change") reviewRequired = true;
      }
    }

    await store.saveSourceState(
      {
        ...state,
        lastCheckedAt: now.toISOString(),
        lastSuccessAt: now.toISOString(),
        lastChangedAt: assessment.contentChanged ? now.toISOString() : state.lastChangedAt,
        lastContentHash: hash,
        lastHttpStatus: res.status,
        consecutiveFailures: 0,
        reviewRequired,
        manualOnly: false,
        manualReason: null,
      },
      source,
    );
    await deps.sleep(deps.delayMs ?? 1500);
  }

  // ---- Conflicts: different official sources proposing different values -----------------------------
  const knownConflicts = await store.openConflictKeys();
  for (const c of findConflicts(await store.openCandidates())) {
    const key = `${c.entityId}::${c.field}::${[c.a.sourceId, c.b.sourceId].sort().join("|")}`;
    if (knownConflicts.has(key)) continue;
    await store.saveConflict(c);
    await store.audit({
      at: deps.now().toISOString(),
      actor: null,
      actorKind: "system",
      action: "conflict_opened",
      entityId: c.entityId,
      candidateId: null,
      versionId: null,
      details: { a: c.a, b: c.b },
    });
    summary.conflictsOpened++;
  }

  await store.finishRun(
    runId,
    summary.failed > 0 && summary.checked === summary.failed
      ? "failed"
      : summary.failed > 0
        ? "partial"
        : "ok",
    summary,
  );
  return summary;
}
