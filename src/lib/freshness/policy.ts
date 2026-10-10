import { SOURCES, type SourceKind, type SourceRecord } from "../knowledge";
import type { MonitoredStatus, SourceFrequency, SourceState, SourceType } from "./types";

/**
 * Monitoring policy per source. Only sources listed in the registry are ever
 * fetched — Raasta is not a crawler. Frequencies are deliberately gentle.
 */

const FREQUENCY_BY_KIND: Record<SourceKind, SourceFrequency> = {
  notification: "daily",
  service_page: "daily",
  form: "weekly",
  faq: "weekly",
  portal: "weekly",
  home: "weekly",
  helpline: "manual",
};

/** Explicit per-source overrides (everything else uses the kind default). */
const OVERRIDES: Record<string, { frequency?: SourceFrequency; autoPublish?: boolean }> = {
  "nadra.fee-structure": { frequency: "daily" },
  "dgip.ordinary-passport": { frequency: "daily" },
  "ict-excise.transfer-fee-notification": { frequency: "daily" },
  "ict-admin.vehicle-transfer": { frequency: "daily" },
};

export const SOURCE_TYPE_BY_KIND: Record<SourceKind, SourceType> = {
  notification: "official-notification",
  service_page: "official-webpage",
  form: "official-form",
  faq: "official-webpage",
  portal: "official-webpage",
  home: "official-webpage",
  helpline: "other",
};

export const DAYS: Record<SourceFrequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  manual: Infinity,
};

export type FreshnessConfig = {
  /** A source not successfully read for this many days is STALE. Configurable per deployment. */
  staleAfterDays: Record<SourceFrequency, number>;
  /** Beyond this many days since the last read, public facts ask the user to confirm. */
  userConfirmAfterDays: number;
};

export const DEFAULT_FRESHNESS: FreshnessConfig = {
  staleAfterDays: { daily: 5, weekly: 21, monthly: 75, manual: 120 },
  userConfirmAfterDays: 45,
};

export function frequencyOf(source: SourceRecord): SourceFrequency {
  return OVERRIDES[source.id]?.frequency ?? FREQUENCY_BY_KIND[source.kind];
}

/** Whether this source may auto-publish. Always false unless explicitly opted in per source. */
export function autoPublishEnabled(sourceId: string): boolean {
  return OVERRIDES[sourceId]?.autoPublish === true;
}

export type MonitoredSource = {
  record: SourceRecord;
  frequency: SourceFrequency;
  sourceType: SourceType;
  /** Fetched automatically, or flagged MANUAL VERIFICATION REQUIRED. */
  monitoring: "auto" | "manual";
};

export function monitoredSources(): MonitoredSource[] {
  return SOURCES.map((record) => {
    const frequency = frequencyOf(record);
    const manual = frequency === "manual" || !record.url.startsWith("https://");
    return {
      record,
      frequency,
      sourceType: SOURCE_TYPE_BY_KIND[record.kind],
      monitoring: manual ? "manual" : "auto",
    };
  });
}

export function isDue(
  frequency: SourceFrequency,
  lastCheckedAt: string | null,
  now: Date,
): boolean {
  if (frequency === "manual") return false;
  if (!lastCheckedAt) return true;
  const elapsedDays = (now.getTime() - new Date(lastCheckedAt).getTime()) / 86_400_000;
  // 3-hour tolerance so a daily cron that drifts slightly never skips a day.
  return elapsedDays >= DAYS[frequency] - 0.125;
}

export type Freshness = "fresh" | "stale" | "very-stale" | "never-checked" | "manual";

/** Source freshness. Reachability is not verification and this says nothing about correctness. */
export function sourceFreshness(
  state: Pick<SourceState, "lastSuccessAt" | "manualOnly">,
  frequency: SourceFrequency,
  now: Date,
  cfg: FreshnessConfig = DEFAULT_FRESHNESS,
): Freshness {
  if (state.manualOnly || frequency === "manual") return "manual";
  if (!state.lastSuccessAt) return "never-checked";
  const days = (now.getTime() - new Date(state.lastSuccessAt).getTime()) / 86_400_000;
  const limit = cfg.staleAfterDays[frequency];
  return days > limit * 2 ? "very-stale" : days > limit ? "stale" : "fresh";
}

export function monitoredStatus(
  state: SourceState,
  frequency: SourceFrequency,
  now: Date,
  cfg: FreshnessConfig = DEFAULT_FRESHNESS,
): MonitoredStatus {
  if (state.consecutiveFailures >= 3) return "unreachable";
  const f = sourceFreshness(state, frequency, now, cfg);
  if (f === "stale" || f === "very-stale") return "stale";
  if (state.reviewRequired || state.manualOnly || f === "never-checked" || f === "manual")
    return "needs-review";
  return state.lastVerifiedAt ? "verified" : "needs-review";
}

export function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).getTime();
  return Number.isNaN(t) ? null : Math.floor((now.getTime() - t) / 86_400_000);
}

export type UserFreshness = { daysAgo: number | null; level: "ok" | "confirm" | "unknown" };

/** What a user may be told about age. Never an invented date: unknown stays unknown. */
export function userFreshness(
  lastReadAt: string | null,
  now: Date,
  cfg: FreshnessConfig = DEFAULT_FRESHNESS,
): UserFreshness {
  const d = daysSince(lastReadAt, now);
  if (d === null) return { daysAgo: null, level: "unknown" };
  return { daysAgo: d, level: d > cfg.userConfirmAfterDays ? "confirm" : "ok" };
}
