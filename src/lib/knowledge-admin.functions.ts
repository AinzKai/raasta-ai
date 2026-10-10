import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKnowledgeAdmin } from "@/lib/admin.server";
import { buildDashboard, type Dashboard } from "@/lib/freshness/dashboard";
import {
  approveCandidate,
  flagForInvestigation,
  rejectCandidate,
  rollbackPublishedVersion,
} from "@/lib/freshness/governance";
import { valueCandidate } from "@/lib/freshness/extract";
import { buildHistory, displayStatus, resolveActive } from "@/lib/freshness/versions";
import { FEES, getSource, type FeeRecord } from "@/lib/knowledge";
import { knowledgeStore, type ConflictRow } from "@/lib/knowledge-store.server";
import { runSourceHealthCheck } from "@/lib/source-health.server";
import { monitorStore } from "@/lib/knowledge-store.server";
import type { ChangeCandidate } from "@/lib/freshness/types";

const fixturesAllowed = () =>
  process.env["ALLOW_KNOWLEDGE_FIXTURES"] === "true" && process.env["NODE_ENV"] !== "production";

/** Is the signed-in user an admin? Reveals nothing else. The UI uses it only to choose what to render; every admin function re-checks. */
export const getAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({
    isAdmin: await knowledgeStore.isAdmin(context.userId),
    fixtures: fixturesAllowed(),
  }));

export const getKnowledgeDashboard = createServerFn({ method: "GET" })
  .middleware([requireKnowledgeAdmin])
  .handler(
    async (): Promise<{
      dashboard: Dashboard;
      pending: ChangeCandidate[];
      recent: ChangeCandidate[];
      conflicts: ConflictRow[];
      fixtures: boolean;
    }> => {
      const now = new Date();
      const [rows, runs, open, recent, conflicts] = await Promise.all([
        knowledgeStore.sourceStates(),
        knowledgeStore.lastRuns(),
        knowledgeStore.listCandidates(["pending", "needs-investigation", "scheduled"], 100),
        knowledgeStore.listCandidates(["approved", "rejected", "published", "rolled-back"], 15),
        knowledgeStore.listConflicts("open"),
      ]);
      const dashboard = buildDashboard(rows as never, runs as never, open, now);
      return {
        dashboard,
        pending: open.filter((c) => displayStatus(c, now) !== "published"),
        recent,
        conflicts,
        fixtures: fixturesAllowed(),
      };
    },
  );

export const getCandidateDetail = createServerFn({ method: "GET" })
  .middleware([requireKnowledgeAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const candidate = await knowledgeStore.getCandidate(data.id);
    if (!candidate) throw new Error("Candidate not found.");
    const now = new Date();
    const seed: FeeRecord | undefined = candidate.entityId
      ? FEES.find((f) => f.id === candidate.entityId)
      : undefined;
    const versions = candidate.entityId ? await knowledgeStore.versionsFor(candidate.entityId) : [];
    const current = seed ? resolveActive(seed.amount, versions, now) : null;
    const source = getSource(candidate.sourceId);
    return {
      candidate,
      displayStatus: displayStatus(candidate, now),
      entity: seed
        ? {
            id: seed.id,
            label: seed.label.en,
            serviceId: seed.serviceId,
            jurisdictionId: seed.jurisdictionId,
          }
        : null,
      currentTrusted: current
        ? { value: current.value, version: current.version, source: current.source }
        : null,
      source: source
        ? {
            id: source.id,
            title: source.title,
            url: source.url,
            agencyId: source.agencyId,
            jurisdictionId: source.jurisdictionId,
            kind: source.kind,
          }
        : null,
      history: seed ? buildHistory(seed.amount, seed.effectiveFrom ?? null, versions, now) : [],
    };
  });

const ReviewInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "investigate"]),
  note: z.string().trim().max(2000).optional(),
  /** ISO date/time the official source says the change takes effect. Leave empty if unknown. */
  effectiveFrom: z.string().max(40).nullable().optional(),
});

export const reviewCandidate = createServerFn({ method: "POST" })
  .middleware([requireKnowledgeAdmin])
  .inputValidator((d: unknown) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const now = new Date();
    const base = { adminId: context.adminId, candidateId: data.id, now, note: data.note ?? null };
    if (data.action === "approve") {
      const r = await approveCandidate(knowledgeStore, {
        ...base,
        effectiveFrom: data.effectiveFrom ? data.effectiveFrom : null,
        allowFixtures: fixturesAllowed(),
      });
      return { ok: true as const, version: r.version.version, scheduled: r.scheduled };
    }
    if (data.action === "reject") await rejectCandidate(knowledgeStore, base);
    else await flagForInvestigation(knowledgeStore, base);
    return { ok: true as const, version: null, scheduled: false };
  });

export const getEntityHistory = createServerFn({ method: "GET" })
  .middleware([requireKnowledgeAdmin])
  .inputValidator((d: unknown) =>
    z.object({ entityId: z.string().min(1).max(160).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const now = new Date();
    const versions = await knowledgeStore.allVersions(data.entityId);
    const audit = await knowledgeStore.listAudit(data.entityId, 100);
    const grouped = new Map<string, typeof versions>();
    for (const v of versions) grouped.set(v.entityId, [...(grouped.get(v.entityId) ?? []), v]);
    const entities = [...grouped.entries()].map(([entityId, vs]) => {
      const seed = FEES.find((f) => f.id === entityId);
      return {
        entityId,
        label: seed?.label.en ?? entityId,
        seedValue: seed?.amount ?? null,
        history: buildHistory(seed?.amount ?? null, seed?.effectiveFrom ?? null, vs, now),
      };
    });
    return { entities, audit };
  });

export const rollbackVersionFn = createServerFn({ method: "POST" })
  .middleware([requireKnowledgeAdmin])
  .inputValidator((d: unknown) =>
    z.object({ versionId: z.string().uuid(), reason: z.string().trim().min(3).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const restored = await rollbackPublishedVersion(knowledgeStore, {
      adminId: context.adminId,
      versionId: data.versionId,
      reason: data.reason,
      now: new Date(),
    });
    return { ok: true as const, restored };
  });

export const resolveConflictFn = createServerFn({ method: "POST" })
  .middleware([requireKnowledgeAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["resolved", "dismissed"]),
        note: z.string().trim().min(3).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const row = await knowledgeStore.resolveConflict(
      data.id,
      context.adminId,
      data.status,
      data.note,
    );
    if (!row) throw new Error("Conflict not found or already closed.");
    await knowledgeStore.audit({
      at: new Date().toISOString(),
      actor: context.adminId,
      actorKind: "admin",
      action: "conflict_resolved",
      entityId: row["entity_id"] as string,
      candidateId: null,
      versionId: null,
      details: { status: data.status, note: data.note },
    });
    return { ok: true as const };
  });

/** Run the monitor now (the same code the daily cron runs). */
export const runMonitorNow = createServerFn({ method: "POST" })
  .middleware([requireKnowledgeAdmin])
  .inputValidator((d: unknown) => z.object({ force: z.boolean().optional() }).parse(d))
  .handler(async ({ data }) => runSourceHealthCheck({ force: data.force === true }));

/**
 * DEVELOPMENT / TEST FIXTURE ONLY. Simulates "a source changed" (CNIC normal
 * renewal 400 -> 600) without pretending a real government page changed.
 * Disabled unless ALLOW_KNOWLEDGE_FIXTURES=true outside production.
 */
export const createFixtureCandidate = createServerFn({ method: "POST" })
  .middleware([requireKnowledgeAdmin])
  .handler(async () => {
    if (!fixturesAllowed()) throw new Error("Fixtures are disabled in this environment.");
    const fee = FEES.find((f) => f.id === "cnic.federal.fee.renewal-normal");
    if (!fee || fee.amount === null) throw new Error("Fixture entity missing.");
    const now = new Date().toISOString();
    const draft = {
      id: crypto.randomUUID(),
      sourceId: "nadra.fee-structure",
      sourceUrl: "https://www.nadra.gov.pk",
      detectedAt: now,
      textHash: null,
      addedFacts: ["600"],
      removedFacts: ["400"],
    };
    const candidate = valueCandidate(
      {
        entityId: fee.id,
        field: "amount",
        proposedValue: 600,
        evidenceQuote: "DEV FIXTURE — simulated change, not taken from a real source",
        effectiveFrom: null,
        confidence: 0.94,
        oldValue: fee.amount,
        entity: {
          entityId: fee.id,
          serviceId: fee.serviceId,
          jurisdictionId: fee.jurisdictionId,
          label: fee.label.en,
          currentAmount: fee.amount,
        },
      },
      draft,
      "fixture",
    );
    await monitorStore.saveCandidate(candidate);
    await knowledgeStore.audit({
      at: now,
      actor: null,
      actorKind: "system",
      action: "candidate_created",
      entityId: candidate.entityId,
      candidateId: candidate.id,
      versionId: null,
      details: { fixture: true },
    });
    return { id: candidate.id };
  });
