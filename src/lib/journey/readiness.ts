import type { RequirementRecord } from "../knowledge";
import type { JourneyState, Readiness } from "./types";

/** An optional requirement counts only if the user says it applies to them. */
export function countsTowardReadiness(req: RequirementRecord, state: JourneyState): boolean {
  return req.required || state.applies[req.id] === true;
}

/**
 * Deterministic readiness: ready required items ÷ required items.
 * No model, no estimation, no rounding games — the same checklist always
 * yields the same number.
 */
export function computeReadiness(
  requirements: RequirementRecord[],
  state: JourneyState,
): Readiness {
  const counted = requirements.filter((r) => countsTowardReadiness(r, state));
  const statusOf = (r: RequirementRecord) => state.checklist[r.id];

  const ready = counted.filter((r) => statusOf(r) === "ready");
  const attention = counted.filter((r) => statusOf(r) === "attention");
  const unavailable = counted.filter((r) => statusOf(r) === "unavailable");
  const pending = counted.filter((r) => statusOf(r) === undefined);

  const total = counted.length;
  const percent = total === 0 ? 0 : Math.round((ready.length / total) * 100);

  let level: Readiness["level"];
  if (total > 0 && ready.length === total) level = "ready";
  else if (unavailable.length > 0) level = "blocked";
  else if (ready.length === 0 && attention.length === 0) level = "not-started";
  else if (total - ready.length <= 2) level = "almost";
  else level = "in-progress";

  return {
    total,
    ready: ready.length,
    percent,
    remaining: total - ready.length,
    attention,
    unavailable,
    pending,
    level,
  };
}
