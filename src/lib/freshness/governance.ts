import { FEES } from "../knowledge";
import {
  GovernanceError,
  planApproval,
  planInvestigation,
  planRejection,
  planRollback,
} from "./versions";
import type { AuditEntry, ChangeCandidate, KnowledgeVersion } from "./types";

/**
 * The human-review workflow. Every trusted-knowledge mutation goes through
 * these functions, which (1) require an admin, (2) validate, (3) claim the
 * candidate so only one reviewer can act, (4) write the version, and (5) write
 * the audit trail. Nothing else may publish knowledge.
 */

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

type WithId<T> = T & { id: string };

export interface GovernanceStore {
  isAdmin(userId: string): Promise<boolean>;
  getCandidate(id: string): Promise<ChangeCandidate | null>;
  claimCandidate(
    id: string,
    from: string[],
    patch: Record<string, unknown>,
  ): Promise<ChangeCandidate | null>;
  setCandidateStatus(id: string, status: string): Promise<void>;
  versionsFor(entityId: string): Promise<Array<WithId<KnowledgeVersion>>>;
  getVersion(id: string): Promise<WithId<KnowledgeVersion> | null>;
  insertVersion(v: Omit<KnowledgeVersion, "id">): Promise<WithId<KnowledgeVersion>>;
  rollbackVersion(
    id: string,
    patch: {
      status: "rolled-back";
      rolledBackAt: string;
      rolledBackBy: string;
      rollbackReason: string;
    },
  ): Promise<boolean>;
  audit(entry: AuditEntry): Promise<void>;
  clearReviewFlagIfResolved(sourceId: string): Promise<void>;
}

/** Authorization is decided here, server-side, from the database — never from anything the client says. */
export async function assertAdmin(
  store: Pick<GovernanceStore, "isAdmin">,
  userId: string | null | undefined,
): Promise<string> {
  if (!userId || !(await store.isAdmin(userId))) throw new ForbiddenError();
  return userId;
}

const OPEN = ["pending", "needs-investigation"];

const snake = (patch: {
  status: string;
  reviewedBy: string;
  reviewedAt: string;
  reviewNote: string | null;
  effectiveFrom?: string | null;
}) => ({
  status: patch.status,
  reviewed_by: patch.reviewedBy,
  reviewed_at: patch.reviewedAt,
  review_note: patch.reviewNote,
  ...(patch.effectiveFrom !== undefined ? { effective_from: patch.effectiveFrom } : {}),
});

async function load(store: GovernanceStore, id: string): Promise<ChangeCandidate> {
  const c = await store.getCandidate(id);
  if (!c) throw new GovernanceError("bad_state", "Candidate not found.");
  return c;
}

export async function approveCandidate(
  store: GovernanceStore,
  args: {
    adminId: string;
    candidateId: string;
    now: Date;
    effectiveFrom?: string | null;
    note?: string | null;
    allowFixtures?: boolean;
  },
): Promise<{ version: WithId<KnowledgeVersion>; scheduled: boolean }> {
  await assertAdmin(store, args.adminId);
  const candidate = await load(store, args.candidateId);
  if (candidate.extraction === "fixture" && !args.allowFixtures) {
    throw new GovernanceError(
      "bad_state",
      "Development fixtures cannot be approved in this environment.",
    );
  }
  const existing = candidate.entityId ? await store.versionsFor(candidate.entityId) : [];
  const seedFee = candidate.entityId ? FEES.find((f) => f.id === candidate.entityId) : undefined;

  const plan = planApproval({
    candidate,
    existing,
    seedFee,
    reviewerId: args.adminId,
    now: args.now,
    ...(args.effectiveFrom !== undefined ? { effectiveFrom: args.effectiveFrom } : {}),
    ...(args.note !== undefined ? { note: args.note } : {}),
  });

  const claimed = await store.claimCandidate(candidate.id, OPEN, snake(plan.candidatePatch));
  if (!claimed)
    throw new GovernanceError("bad_state", "Another reviewer already acted on this candidate.");

  let version: WithId<KnowledgeVersion>;
  try {
    version = await store.insertVersion(plan.version);
  } catch (e) {
    // Do not leave a half-approved candidate behind.
    await store.setCandidateStatus(candidate.id, candidate.status);
    throw e;
  }
  for (const entry of plan.audit)
    await store.audit({
      ...entry,
      versionId: entry.action === "version_published" ? version.id : null,
    });
  await store.clearReviewFlagIfResolved(candidate.sourceId);
  return { version, scheduled: plan.candidatePatch.status === "scheduled" };
}

export async function rejectCandidate(
  store: GovernanceStore,
  args: { adminId: string; candidateId: string; now: Date; note?: string | null },
) {
  await assertAdmin(store, args.adminId);
  const candidate = await load(store, args.candidateId);
  const plan = planRejection(candidate, args.adminId, args.now, args.note ?? null);
  const claimed = await store.claimCandidate(candidate.id, OPEN, snake(plan.candidatePatch));
  if (!claimed)
    throw new GovernanceError("bad_state", "Another reviewer already acted on this candidate.");
  for (const entry of plan.audit) await store.audit(entry);
  await store.clearReviewFlagIfResolved(candidate.sourceId);
}

export async function flagForInvestigation(
  store: GovernanceStore,
  args: { adminId: string; candidateId: string; now: Date; note?: string | null },
) {
  await assertAdmin(store, args.adminId);
  const candidate = await load(store, args.candidateId);
  const plan = planInvestigation(candidate, args.adminId, args.now, args.note ?? null);
  const claimed = await store.claimCandidate(candidate.id, ["pending"], snake(plan.candidatePatch));
  if (!claimed)
    throw new GovernanceError("bad_state", "Another reviewer already acted on this candidate.");
  for (const entry of plan.audit) await store.audit(entry);
}

export async function rollbackPublishedVersion(
  store: GovernanceStore,
  args: { adminId: string; versionId: string; reason: string; now: Date },
) {
  await assertAdmin(store, args.adminId);
  const version = await store.getVersion(args.versionId);
  if (!version) throw new GovernanceError("bad_state", "Version not found.");
  const all = await store.versionsFor(version.entityId);
  const seedFee = FEES.find((f) => f.id === version.entityId);
  const plan = planRollback({
    version,
    seedFee,
    all,
    reviewerId: args.adminId,
    reason: args.reason,
    now: args.now,
  });

  const ok = await store.rollbackVersion(version.id, plan.versionPatch);
  if (!ok) throw new GovernanceError("bad_state", "That version was already rolled back.");
  if (version.candidateId)
    await store.setCandidateStatus(version.candidateId, plan.candidateStatus);
  await store.audit(plan.audit);
  return plan.restored;
}
