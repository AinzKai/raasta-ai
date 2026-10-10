/**
 * Supabase-backed store for knowledge governance. Server-only: it uses the
 * service role, so callers MUST have authorized the request first (admin
 * middleware) or be the cron/monitor path. Nothing here is reachable by an
 * ordinary user's browser client.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import type { DetectedConflict } from "@/lib/freshness/conflicts";
import type { CheckRow, MonitorStore } from "@/lib/freshness/monitor";
import type { MonitoredSource } from "@/lib/freshness/policy";
import { monitoredStatus } from "@/lib/freshness/policy";
import type {
  AuditEntry,
  ChangeCandidate,
  KnowledgeVersion,
  PublishedVersion,
  SourceEvidence,
  SourceState,
} from "@/lib/freshness/types";

// The generated types predate these tables; this narrow escape hatch keeps the rest of the app strictly typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function must<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

// ------------------------------------------------------------------ mappers ----

type CandidateRow = Record<string, unknown>;

export function candidateFromRow(r: CandidateRow): ChangeCandidate {
  return {
    id: r["id"] as string,
    kind: r["kind"] as ChangeCandidate["kind"],
    sourceId: r["source_id"] as string,
    serviceId: (r["service_id"] as string | null) ?? null,
    entityId: (r["entity_id"] as string | null) ?? null,
    jurisdictionId: (r["jurisdiction_id"] as string | null) ?? null,
    field: (r["field"] as "amount" | null) ?? null,
    oldValue:
      r["old_value"] === null || r["old_value"] === undefined ? null : Number(r["old_value"]),
    proposedValue:
      r["proposed_value"] === null || r["proposed_value"] === undefined
        ? null
        : Number(r["proposed_value"]),
    detectedAt: r["detected_at"] as string,
    confidence: Number(r["confidence"] ?? 0),
    sourceEvidence: (r["source_evidence"] as SourceEvidence) ?? {
      quote: null,
      url: "",
      addedFacts: [],
      removedFacts: [],
      textHash: null,
    },
    status: r["status"] as ChangeCandidate["status"],
    extraction: r["extraction"] as ChangeCandidate["extraction"],
    reviewedBy: (r["reviewed_by"] as string | null) ?? null,
    reviewedAt: (r["reviewed_at"] as string | null) ?? null,
    reviewNote: (r["review_note"] as string | null) ?? null,
    effectiveFrom: (r["effective_from"] as string | null) ?? null,
    effectiveUntil: (r["effective_until"] as string | null) ?? null,
  };
}

function candidateToRow(c: ChangeCandidate) {
  return {
    id: c.id,
    kind: c.kind,
    source_id: c.sourceId,
    service_id: c.serviceId,
    entity_id: c.entityId,
    jurisdiction_id: c.jurisdictionId,
    field: c.field,
    old_value: c.oldValue,
    proposed_value: c.proposedValue,
    detected_at: c.detectedAt,
    confidence: c.confidence,
    source_evidence: c.sourceEvidence as unknown as Json,
    status: c.status,
    extraction: c.extraction,
    effective_from: c.effectiveFrom,
    effective_until: c.effectiveUntil,
  };
}

export function versionFromRow(r: CandidateRow): KnowledgeVersion & { id: string } {
  return {
    id: r["id"] as string,
    entityType: "fee",
    entityId: r["entity_id"] as string,
    field: "amount",
    version: r["version"] as number,
    value: Number(r["value"]),
    status: r["status"] as KnowledgeVersion["status"],
    effectiveFrom: (r["effective_from"] as string | null) ?? null,
    effectiveUntil: (r["effective_until"] as string | null) ?? null,
    sourceId: r["source_id"] as string,
    candidateId: (r["candidate_id"] as string | null) ?? null,
    createdAt: r["created_at"] as string,
    approvedBy: (r["approved_by"] as string | null) ?? null,
    approvedAt: (r["approved_at"] as string | null) ?? null,
    rolledBackAt: (r["rolled_back_at"] as string | null) ?? null,
    rolledBackBy: (r["rolled_back_by"] as string | null) ?? null,
    rollbackReason: (r["rollback_reason"] as string | null) ?? null,
  };
}

const auditRow = (a: AuditEntry) => ({
  at: a.at,
  actor: a.actor,
  actor_kind: a.actorKind,
  action: a.action,
  entity_id: a.entityId,
  candidate_id: a.candidateId,
  version_id: a.versionId,
  details: a.details as unknown as Json,
});

export type ConflictRow = {
  id: string;
  entityId: string;
  field: string;
  sourceA: string;
  valueA: number;
  sourceB: string;
  valueB: number;
  status: string;
  detectedAt: string;
  resolutionNote: string | null;
};
export type AuditRow = {
  id: number;
  at: string;
  actor: string | null;
  actorKind: string;
  action: string;
  entityId: string | null;
  candidateId: string | null;
  versionId: string | null;
  details: Record<string, Json | undefined>;
};

const conflictFromRow = (r: CandidateRow): ConflictRow => ({
  id: r["id"] as string,
  entityId: r["entity_id"] as string,
  field: r["field"] as string,
  sourceA: r["source_a"] as string,
  valueA: Number(r["value_a"]),
  sourceB: r["source_b"] as string,
  valueB: Number(r["value_b"]),
  status: r["status"] as string,
  detectedAt: r["detected_at"] as string,
  resolutionNote: (r["resolution_note"] as string | null) ?? null,
});
const auditFromRow = (r: CandidateRow): AuditRow => ({
  id: Number(r["id"]),
  at: r["at"] as string,
  actor: (r["actor"] as string | null) ?? null,
  actorKind: r["actor_kind"] as string,
  action: r["action"] as string,
  entityId: (r["entity_id"] as string | null) ?? null,
  candidateId: (r["candidate_id"] as string | null) ?? null,
  versionId: (r["version_id"] as string | null) ?? null,
  details: (r["details"] as Record<string, Json | undefined>) ?? {},
});

// -------------------------------------------------------------- the store -------

export const knowledgeStore = {
  async audit(entry: AuditEntry): Promise<void> {
    must(await db.from("knowledge_audit").insert(auditRow(entry)), "audit");
  },

  async publishedVersions(): Promise<PublishedVersion[]> {
    const rows = must<CandidateRow[]>(
      await db
        .from("knowledge_versions")
        .select(
          "entity_id, field, version, value, effective_from, effective_until, created_at, approved_at, source_id",
        )
        .eq("status", "published"),
      "published versions",
    );
    return rows.map((r) => ({
      entityId: r["entity_id"] as string,
      field: "amount" as const,
      version: r["version"] as number,
      value: Number(r["value"]),
      effectiveFrom: (r["effective_from"] as string | null) ?? null,
      effectiveUntil: (r["effective_until"] as string | null) ?? null,
      createdAt: r["created_at"] as string,
      approvedAt: (r["approved_at"] as string | null) ?? null,
      sourceId: r["source_id"] as string,
    }));
  },

  async allVersions(entityId?: string): Promise<Array<KnowledgeVersion & { id: string }>> {
    let q = db
      .from("knowledge_versions")
      .select("*")
      .order("version", { ascending: false })
      .limit(500);
    if (entityId) q = q.eq("entity_id", entityId);
    return must<CandidateRow[]>(await q, "versions").map(versionFromRow);
  },

  async versionsFor(entityId: string) {
    return this.allVersions(entityId);
  },

  async getVersion(id: string) {
    const row = must<CandidateRow | null>(
      await db.from("knowledge_versions").select("*").eq("id", id).maybeSingle(),
      "version",
    );
    return row ? versionFromRow(row) : null;
  },

  async getCandidate(id: string): Promise<ChangeCandidate | null> {
    const row = must<CandidateRow | null>(
      await db.from("knowledge_change_candidates").select("*").eq("id", id).maybeSingle(),
      "candidate",
    );
    return row ? candidateFromRow(row) : null;
  },

  async listCandidates(statuses?: string[], limit = 200): Promise<ChangeCandidate[]> {
    let q = db
      .from("knowledge_change_candidates")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(limit);
    if (statuses?.length) q = q.in("status", statuses);
    return must<CandidateRow[]>(await q, "candidates").map(candidateFromRow);
  },

  /** Single-winner claim: only one concurrent reviewer can move a candidate out of its open state. */
  async claimCandidate(
    id: string,
    from: string[],
    patch: Record<string, unknown>,
  ): Promise<ChangeCandidate | null> {
    const res = await db
      .from("knowledge_change_candidates")
      .update(patch)
      .eq("id", id)
      .in("status", from)
      .select("*");
    const rows = must<CandidateRow[]>(res, "claim candidate");
    return rows[0] ? candidateFromRow(rows[0]) : null;
  },

  async insertVersion(v: Omit<KnowledgeVersion, "id">): Promise<KnowledgeVersion & { id: string }> {
    const res = await db
      .from("knowledge_versions")
      .insert({
        entity_type: v.entityType,
        entity_id: v.entityId,
        field: v.field,
        version: v.version,
        value: v.value,
        status: v.status,
        effective_from: v.effectiveFrom,
        effective_until: v.effectiveUntil,
        source_id: v.sourceId,
        candidate_id: v.candidateId,
        created_at: v.createdAt,
        approved_by: v.approvedBy,
        approved_at: v.approvedAt,
      })
      .select("*")
      .single();
    return versionFromRow(must<CandidateRow>(res, "insert version"));
  },

  async rollbackVersion(
    id: string,
    patch: {
      status: "rolled-back";
      rolledBackAt: string;
      rolledBackBy: string;
      rollbackReason: string;
    },
  ): Promise<boolean> {
    const res = await db
      .from("knowledge_versions")
      .update({
        status: patch.status,
        rolled_back_at: patch.rolledBackAt,
        rolled_back_by: patch.rolledBackBy,
        rollback_reason: patch.rollbackReason,
      })
      .eq("id", id)
      .eq("status", "published")
      .select("id");
    return must<unknown[]>(res, "rollback version").length === 1;
  },

  async setCandidateStatus(id: string, status: string): Promise<void> {
    must(
      await db.from("knowledge_change_candidates").update({ status }).eq("id", id),
      "candidate status",
    );
  },

  async listConflicts(status = "open"): Promise<ConflictRow[]> {
    return must<CandidateRow[]>(
      await db
        .from("knowledge_conflicts")
        .select("*")
        .eq("status", status)
        .order("detected_at", { ascending: false })
        .limit(100),
      "conflicts",
    ).map(conflictFromRow);
  },

  async resolveConflict(
    id: string,
    adminId: string,
    status: "resolved" | "dismissed",
    note: string,
  ): Promise<CandidateRow | null> {
    const res = await db
      .from("knowledge_conflicts")
      .update({
        status,
        resolved_by: adminId,
        resolved_at: new Date().toISOString(),
        resolution_note: note,
      })
      .eq("id", id)
      .eq("status", "open")
      .select("*");
    return must<CandidateRow[]>(res, "resolve conflict")[0] ?? null;
  },

  async listAudit(entityId?: string, limit = 100): Promise<AuditRow[]> {
    let q = db.from("knowledge_audit").select("*").order("at", { ascending: false }).limit(limit);
    if (entityId) q = q.eq("entity_id", entityId);
    return must<CandidateRow[]>(await q, "audit").map(auditFromRow);
  },

  async latestSnapshotText(sourceId: string): Promise<string | null> {
    const row = must<{ normalized_text: string } | null>(
      await db
        .from("source_snapshots")
        .select("normalized_text")
        .eq("source_id", sourceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "snapshot",
    );
    return row?.normalized_text ?? null;
  },

  async clearReviewFlagIfResolved(sourceId: string): Promise<void> {
    const open = must<unknown[]>(
      await db
        .from("knowledge_change_candidates")
        .select("id")
        .eq("source_id", sourceId)
        .in("status", ["pending", "needs-investigation"])
        .limit(1),
      "open candidates",
    );
    if (open.length === 0)
      must(
        await db.from("knowledge_sources").update({ review_required: false }).eq("id", sourceId),
        "clear review flag",
      );
  },

  async sourceStates() {
    return must<CandidateRow[]>(
      await db.from("knowledge_sources").select("*").order("id"),
      "source states",
    );
  },

  async lastRuns() {
    return must<CandidateRow[]>(
      await db.from("monitor_runs").select("*").order("started_at", { ascending: false }).limit(20),
      "runs",
    );
  },

  async isAdmin(userId: string): Promise<boolean> {
    const row = must<{ user_id: string } | null>(
      await db.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle(),
      "admin lookup",
    );
    return !!row;
  },
};

// -------------------------------------------------- monitor store (cron path) -----

export const monitorStore: MonitorStore = {
  async getSourceState(sourceId) {
    const r = must<CandidateRow | null>(
      await db.from("knowledge_sources").select("*").eq("id", sourceId).maybeSingle(),
      "source state",
    );
    if (!r) return null;
    return {
      sourceId,
      lastCheckedAt: (r["last_checked_at"] as string | null) ?? null,
      lastSuccessAt: (r["last_success_at"] as string | null) ?? null,
      lastVerifiedAt: (r["last_verified_at"] as string | null) ?? null,
      lastChangedAt: (r["last_changed_at"] as string | null) ?? null,
      lastContentHash: (r["last_content_hash"] as string | null) ?? null,
      lastHttpStatus: (r["last_http_status"] as number | null) ?? null,
      consecutiveFailures: (r["consecutive_failures"] as number) ?? 0,
      reviewRequired: !!r["review_required"],
      manualOnly: !!r["manual_only"],
      manualReason: (r["manual_reason"] as string | null) ?? null,
    } satisfies SourceState;
  },

  async saveSourceState(state, source: MonitoredSource) {
    const now = new Date();
    must(
      await db.from("knowledge_sources").upsert({
        id: state.sourceId,
        name: source.record.title,
        agency_id: source.record.agencyId,
        jurisdiction_id: source.record.jurisdictionId,
        url: source.record.url,
        source_type: source.sourceType,
        refresh_frequency: source.frequency,
        monitoring: source.monitoring,
        is_official: source.record.official,
        priority: source.record.priority,
        verification_status: monitoredStatus(state, source.frequency, now),
        review_required: state.reviewRequired,
        manual_only: state.manualOnly,
        manual_reason: state.manualReason,
        last_checked_at: state.lastCheckedAt,
        last_success_at: state.lastSuccessAt,
        last_verified_at: state.lastVerifiedAt,
        last_changed_at: state.lastChangedAt,
        last_content_hash: state.lastContentHash,
        last_http_status: state.lastHttpStatus,
        consecutive_failures: state.consecutiveFailures,
        notes: source.record.notes ?? null,
        updated_at: now.toISOString(),
      }),
      "save source state",
    );
  },

  async latestSnapshot(sourceId) {
    const r = must<{ content_hash: string; normalized_text: string } | null>(
      await db
        .from("source_snapshots")
        .select("content_hash, normalized_text")
        .eq("source_id", sourceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "latest snapshot",
    );
    return r ? { hash: r.content_hash, text: r.normalized_text } : null;
  },

  async saveCheck(row: CheckRow) {
    const res = await db
      .from("source_health")
      .insert({
        source_id: row.sourceId,
        service_slug: row.agencyId,
        source_url: row.url,
        agency_id: row.agencyId,
        jurisdiction_id: row.jurisdictionId,
        status: row.status,
        http_status: row.httpStatus,
        error_message: row.error,
        content_hash: row.contentHash,
        content_changed: row.contentChanged,
        review_required: row.reviewRequired,
        fetch_skipped_reason: row.skippedReason,
        final_url: row.finalUrl,
        content_length: row.contentLength,
      })
      .select("id")
      .single();
    return must<{ id: string }>(res, "save check").id;
  },

  async saveSnapshot(sourceId, checkId, hash, text) {
    must(
      await db.from("source_snapshots").insert({
        source_id: sourceId,
        check_id: checkId,
        content_hash: hash,
        normalized_text: text,
      }),
      "save snapshot",
    );
    // Keep only the three most recent snapshots per source.
    const old = must<Array<{ id: string }>>(
      await db
        .from("source_snapshots")
        .select("id")
        .eq("source_id", sourceId)
        .order("created_at", { ascending: false })
        .range(3, 50),
      "old snapshots",
    );
    if (old.length)
      must(
        await db
          .from("source_snapshots")
          .delete()
          .in(
            "id",
            old.map((o) => o.id),
          ),
        "prune snapshots",
      );
  },

  publishedVersions: knowledgeStore.publishedVersions,

  async openCandidates() {
    return knowledgeStore.listCandidates(["pending", "needs-investigation"], 500);
  },

  async saveCandidate(c) {
    must(await db.from("knowledge_change_candidates").insert(candidateToRow(c)), "save candidate");
  },

  async saveConflict(c: DetectedConflict) {
    must(
      await db.from("knowledge_conflicts").insert({
        entity_id: c.entityId,
        field: c.field,
        source_a: c.a.sourceId,
        value_a: c.a.value,
        candidate_a: c.a.candidateId,
        source_b: c.b.sourceId,
        value_b: c.b.value,
        candidate_b: c.b.candidateId,
      }),
      "save conflict",
    );
  },

  async openConflictKeys() {
    const rows = must<CandidateRow[]>(
      await db
        .from("knowledge_conflicts")
        .select("entity_id, field, source_a, source_b")
        .eq("status", "open"),
      "open conflicts",
    );
    return new Set(
      rows.map(
        (r) =>
          `${r["entity_id"]}::${r["field"]}::${[r["source_a"], r["source_b"]].sort().join("|")}`,
      ),
    );
  },

  audit: knowledgeStore.audit,

  async startRun() {
    return must<{ id: string }>(
      await db.from("monitor_runs").insert({}).select("id").single(),
      "start run",
    ).id;
  },

  async finishRun(id, status, summary) {
    must(
      await db
        .from("monitor_runs")
        .update({
          finished_at: new Date().toISOString(),
          status,
          summary: summary as unknown as Json,
        })
        .eq("id", id),
      "finish run",
    );
  },
};
