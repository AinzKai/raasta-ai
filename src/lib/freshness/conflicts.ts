import type { ChangeCandidate } from "./types";

export type DetectedConflict = {
  entityId: string;
  field: string;
  a: { sourceId: string; value: number; candidateId: string };
  b: { sourceId: string; value: number; candidateId: string };
};

/**
 * Two different sources proposing different values for the same fact. We never
 * pick one automatically: this becomes a conflict for a human to resolve.
 */
export function findConflicts(candidates: ChangeCandidate[]): DetectedConflict[] {
  const open = candidates.filter(
    (c) =>
      c.kind === "value_change" &&
      c.entityId &&
      c.field &&
      c.proposedValue !== null &&
      (c.status === "pending" || c.status === "needs-investigation"),
  );
  const out: DetectedConflict[] = [];
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const a = open[i]!;
      const b = open[j]!;
      if (
        a.entityId === b.entityId &&
        a.field === b.field &&
        a.sourceId !== b.sourceId &&
        a.proposedValue !== b.proposedValue
      ) {
        out.push({
          entityId: a.entityId!,
          field: a.field!,
          a: { sourceId: a.sourceId, value: a.proposedValue!, candidateId: a.id },
          b: { sourceId: b.sourceId, value: b.proposedValue!, candidateId: b.id },
        });
      }
    }
  }
  return out;
}
