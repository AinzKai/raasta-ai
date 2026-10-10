import { displayStatus } from "./versions";
import { monitoredSources, monitoredStatus, sourceFreshness, type Freshness } from "./policy";
import type { ChangeCandidate, SourceState } from "./types";

export type SourceRowLike = {
  id: string;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_verified_at: string | null;
  last_changed_at: string | null;
  last_content_hash: string | null;
  last_http_status: number | null;
  consecutive_failures: number;
  review_required: boolean;
  manual_only: boolean;
  manual_reason: string | null;
};

export type RunLike = { started_at: string; finished_at: string | null; status: string };

export type SourceHealthLine = {
  id: string;
  name: string;
  freshness: Freshness;
  lastSuccessAt: string | null;
  lastCheckedAt: string | null;
  manualReason: string | null;
  failures: number;
};

export type Dashboard = {
  counts: {
    monitored: number;
    healthy: number;
    changesDetected: number;
    pendingReviews: number;
    stale: number;
    unreachable: number;
    manual: number;
    neverChecked: number;
  };
  lastRun: { at: string; status: string } | null;
  lastSuccessfulRun: { at: string } | null;
  staleSources: SourceHealthLine[];
  unreachableSources: SourceHealthLine[];
  manualSources: SourceHealthLine[];
};

const toState = (id: string, r: SourceRowLike | undefined): SourceState => ({
  sourceId: id,
  lastCheckedAt: r?.last_checked_at ?? null,
  lastSuccessAt: r?.last_success_at ?? null,
  lastVerifiedAt: r?.last_verified_at ?? null,
  lastChangedAt: r?.last_changed_at ?? null,
  lastContentHash: r?.last_content_hash ?? null,
  lastHttpStatus: r?.last_http_status ?? null,
  consecutiveFailures: r?.consecutive_failures ?? 0,
  reviewRequired: r?.review_required ?? false,
  manualOnly: r?.manual_only ?? false,
  manualReason: r?.manual_reason ?? null,
});

/**
 * Knowledge-health summary. "Healthy" means reachable and recently read — it
 * says nothing about whether the knowledge itself has been verified.
 */
export function buildDashboard(
  rows: SourceRowLike[],
  runs: RunLike[],
  candidates: ChangeCandidate[],
  now: Date,
): Dashboard {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const sources = monitoredSources();
  const counts = {
    monitored: sources.length,
    healthy: 0,
    changesDetected: 0,
    pendingReviews: 0,
    stale: 0,
    unreachable: 0,
    manual: 0,
    neverChecked: 0,
  };
  const stale: SourceHealthLine[] = [];
  const unreachable: SourceHealthLine[] = [];
  const manual: SourceHealthLine[] = [];

  for (const s of sources) {
    const state = toState(s.record.id, byId.get(s.record.id));
    const f = sourceFreshness(state, s.frequency, now);
    const line: SourceHealthLine = {
      id: s.record.id,
      name: s.record.title,
      freshness: f,
      lastSuccessAt: state.lastSuccessAt,
      lastCheckedAt: state.lastCheckedAt,
      manualReason: state.manualReason,
      failures: state.consecutiveFailures,
    };
    const status = monitoredStatus(state, s.frequency, now);
    if (s.monitoring === "manual" || state.manualOnly) {
      counts.manual++;
      manual.push(line);
    } else if (status === "unreachable") {
      counts.unreachable++;
      unreachable.push(line);
    } else if (status === "stale") {
      counts.stale++;
      stale.push(line);
    } else if (f === "never-checked") counts.neverChecked++;
    else counts.healthy++;
    if (
      state.lastChangedAt &&
      now.getTime() - new Date(state.lastChangedAt).getTime() < 7 * 86_400_000
    )
      counts.changesDetected++;
  }
  counts.pendingReviews = candidates.filter(
    (c) => displayStatus(c, now) === "pending" || c.status === "needs-investigation",
  ).length;

  const sorted = [...runs].sort((a, b) => b.started_at.localeCompare(a.started_at));
  const last = sorted[0];
  const ok = sorted.find((r) => r.status === "ok" && r.finished_at);
  return {
    counts,
    lastRun: last ? { at: last.finished_at ?? last.started_at, status: last.status } : null,
    lastSuccessfulRun: ok ? { at: ok.finished_at! } : null,
    staleSources: stale,
    unreachableSources: unreachable,
    manualSources: manual,
  };
}
