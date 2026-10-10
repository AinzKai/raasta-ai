import { isTrusted, type FeeRecord } from "../knowledge";
import type {
  AuditEntry,
  CandidateStatus,
  ChangeCandidate,
  KnowledgeVersion,
  PublishedVersion,
} from "./types";

/** Minimal shape needed to decide which version is active — satisfied by DB rows and public views. */
export type VersionLike = {
  version: number;
  value: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  createdAt: string;
  approvedAt?: string | null;
  status?: "published" | "rolled-back";
};

const ms = (iso: string) => new Date(iso).getTime();

/** When a version takes effect. A null effective date means "from publication" — never an invented date. */
export function startsAt(v: VersionLike): number {
  return ms(v.effectiveFrom ?? v.approvedAt ?? v.createdAt);
}

export function isEffective(v: VersionLike, now: Date): boolean {
  if (v.status === "rolled-back") return false;
  const t = now.getTime();
  return startsAt(v) <= t && (!v.effectiveUntil || t < ms(v.effectiveUntil));
}

export type ActiveResolution<V extends VersionLike> = {
  value: number | null;
  /** 1 = the seeded baseline in code. */
  version: number;
  source: "seed" | "published";
  record: V | null;
  upcoming: V | null;
};

/**
 * Which value is active for `now`? Seed (v1) unless an effective published
 * version overrides it. Pure and date-driven, so a scheduled change takes
 * effect on its date with no deploy and no job.
 */
export function resolveActive<V extends VersionLike>(
  seedValue: number | null,
  versions: V[],
  now: Date,
): ActiveResolution<V> {
  const live = versions.filter((v) => v.status !== "rolled-back");
  const effective = live
    .filter((v) => isEffective(v, now))
    .sort((a, b) => startsAt(b) - startsAt(a) || b.version - a.version);
  const active = effective[0] ?? null;
  const upcoming =
    live.filter((v) => startsAt(v) > now.getTime()).sort((a, b) => startsAt(a) - startsAt(b))[0] ??
    null;
  return {
    value: active ? active.value : seedValue,
    version: active ? active.version : 1,
    source: active ? "published" : "seed",
    record: active,
    upcoming: upcoming && upcoming.value !== (active ? active.value : seedValue) ? upcoming : null,
  };
}

const keyOf = (entityId: string, field: string) => `${entityId}::${field}`;

/** Overlay approved versions onto the seeded fee records. Pending and rejected data can never appear here. */
export function applyOverlayToFees(
  fees: FeeRecord[],
  versions: PublishedVersion[],
  now: Date = new Date(),
): FeeRecord[] {
  if (versions.length === 0) return fees;
  const byEntity = new Map<string, Array<PublishedVersion & VersionLike>>();
  for (const v of versions) {
    if (v.field !== "amount") continue;
    const like = {
      ...v,
      effectiveUntil: v.effectiveUntil ?? null,
      createdAt: v.createdAt ?? v.approvedAt ?? new Date(0).toISOString(),
    };
    const list = byEntity.get(keyOf(v.entityId, v.field)) ?? [];
    list.push(like);
    byEntity.set(keyOf(v.entityId, v.field), list);
  }

  return fees.map((fee) => {
    if (fee.historical) return fee;
    const list = byEntity.get(keyOf(fee.id, "amount"));
    if (!list) return fee;
    const res = resolveActive(fee.amount, list, now);
    const next: FeeRecord = { ...fee };
    if (res.record && res.value !== null) {
      next.amount = res.value;
      next.verificationStatus = "verified";
      next.sourceId = fee.sourceId;
      next.activeVersion = res.version;
      next.lastVerifiedAt = (res.record.approvedAt ?? res.record.createdAt).slice(0, 10);
      next.basis = `Approved knowledge version ${res.version}, reviewed by a Raasta administrator against the official source.`;
      next.effectiveFrom = res.record.effectiveFrom ?? fee.effectiveFrom ?? null;
      // A caveat that explained why the value was uncertain no longer applies once a reviewer approved it.
      if (!isTrusted(fee.verificationStatus)) delete next.caveat;
    }
    if (res.upcoming)
      next.upcoming = {
        amount: res.upcoming.value,
        effectiveFrom: new Date(startsAt(res.upcoming)).toISOString(),
      };
    return next;
  });
}

// ------------------------------------------------------------------ planning --

export class GovernanceError extends Error {
  constructor(
    public code:
      | "bad_state"
      | "invalid_candidate"
      | "unknown_entity"
      | "base_changed"
      | "invalid_date"
      | "reason_required",
    message: string,
  ) {
    super(message);
    this.name = "GovernanceError";
  }
}

export type ApprovalInput = {
  candidate: ChangeCandidate;
  /** Existing versions for this entity+field (any status). */
  existing: KnowledgeVersion[];
  /** The seeded fee for this entity, or undefined if the entity does not exist. */
  seedFee: FeeRecord | undefined;
  reviewerId: string;
  now: Date;
  effectiveFrom?: string | null;
  note?: string | null;
};

export type ApprovalPlan = {
  version: Omit<KnowledgeVersion, "id">;
  candidatePatch: {
    status: CandidateStatus;
    reviewedBy: string;
    reviewedAt: string;
    reviewNote: string | null;
    effectiveFrom: string | null;
  };
  audit: AuditEntry[];
};

function parseWhen(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t))
    throw new GovernanceError("invalid_date", "Effective date is not a valid date.");
  return new Date(t).toISOString();
}

export function planApproval(i: ApprovalInput): ApprovalPlan {
  const { candidate: c, existing, seedFee, reviewerId, now } = i;
  if (c.status !== "pending" && c.status !== "needs-investigation") {
    throw new GovernanceError("bad_state", `A ${c.status} candidate cannot be approved.`);
  }
  if (
    c.kind !== "value_change" ||
    !c.entityId ||
    c.field !== "amount" ||
    c.proposedValue === null ||
    !(c.proposedValue > 0)
  ) {
    throw new GovernanceError(
      "invalid_candidate",
      "Only a complete amount change can be approved. Investigate or reject this one.",
    );
  }
  if (!seedFee || seedFee.historical)
    throw new GovernanceError("unknown_entity", `Unknown or superseded entity ${c.entityId}.`);

  const current = resolveActive(seedFee.amount, existing, now).value;
  if (c.oldValue !== null && current !== null && c.oldValue !== current) {
    throw new GovernanceError(
      "base_changed",
      `The trusted value is now ${current}, not ${c.oldValue}. Reject this candidate and let monitoring re-detect.`,
    );
  }

  const effectiveFrom = parseWhen(
    i.effectiveFrom !== undefined ? i.effectiveFrom : c.effectiveFrom,
  );
  const nextVersion = Math.max(1, ...existing.map((v) => v.version)) + 1;
  const scheduled = effectiveFrom !== null && new Date(effectiveFrom).getTime() > now.getTime();
  const at = now.toISOString();

  const version: Omit<KnowledgeVersion, "id"> = {
    entityType: "fee",
    entityId: c.entityId,
    field: "amount",
    version: nextVersion,
    value: c.proposedValue,
    status: "published",
    effectiveFrom,
    effectiveUntil: null,
    sourceId: c.sourceId,
    candidateId: c.id,
    createdAt: at,
    approvedBy: reviewerId,
    approvedAt: at,
    rolledBackAt: null,
    rolledBackBy: null,
    rollbackReason: null,
  };

  return {
    version,
    candidatePatch: {
      status: scheduled ? "scheduled" : "published",
      reviewedBy: reviewerId,
      reviewedAt: at,
      reviewNote: i.note ?? null,
      effectiveFrom,
    },
    audit: [
      {
        at,
        actor: reviewerId,
        actorKind: "admin",
        action: "candidate_approved",
        entityId: c.entityId,
        candidateId: c.id,
        versionId: null,
        details: {
          oldValue: c.oldValue,
          newValue: c.proposedValue,
          sourceId: c.sourceId,
          detectedAt: c.detectedAt,
          note: i.note ?? null,
        },
      },
      {
        at,
        actor: reviewerId,
        actorKind: "admin",
        action: "version_published",
        entityId: c.entityId,
        candidateId: c.id,
        versionId: null,
        details: {
          version: nextVersion,
          previousValue: current,
          newValue: c.proposedValue,
          effectiveFrom,
          effectiveDateKnown: effectiveFrom !== null,
          activeFromPublication: effectiveFrom === null,
        },
      },
    ],
  };
}

export function planRejection(
  candidate: ChangeCandidate,
  reviewerId: string,
  now: Date,
  note: string | null,
) {
  if (candidate.status !== "pending" && candidate.status !== "needs-investigation") {
    throw new GovernanceError("bad_state", `A ${candidate.status} candidate cannot be rejected.`);
  }
  const at = now.toISOString();
  return {
    candidatePatch: {
      status: "rejected" as const,
      reviewedBy: reviewerId,
      reviewedAt: at,
      reviewNote: note,
    },
    audit: [
      {
        at,
        actor: reviewerId,
        actorKind: "admin" as const,
        action: "candidate_rejected" as const,
        entityId: candidate.entityId,
        candidateId: candidate.id,
        versionId: null,
        details: { proposedValue: candidate.proposedValue, note },
      },
    ],
  };
}

export function planInvestigation(
  candidate: ChangeCandidate,
  reviewerId: string,
  now: Date,
  note: string | null,
) {
  if (candidate.status !== "pending")
    throw new GovernanceError(
      "bad_state",
      `Only a pending candidate can be flagged for investigation (this one is ${candidate.status}).`,
    );
  const at = now.toISOString();
  return {
    candidatePatch: {
      status: "needs-investigation" as const,
      reviewedBy: reviewerId,
      reviewedAt: at,
      reviewNote: note,
    },
    audit: [
      {
        at,
        actor: reviewerId,
        actorKind: "admin" as const,
        action: "candidate_needs_investigation" as const,
        entityId: candidate.entityId,
        candidateId: candidate.id,
        versionId: null,
        details: { note },
      },
    ],
  };
}

export function planRollback(args: {
  version: KnowledgeVersion;
  seedFee: FeeRecord | undefined;
  all: KnowledgeVersion[];
  reviewerId: string;
  reason: string;
  now: Date;
}) {
  const { version, all, reviewerId, now } = args;
  if (version.status !== "published")
    throw new GovernanceError("bad_state", "Only a published version can be rolled back.");
  if (args.reason.trim().length < 3)
    throw new GovernanceError("reason_required", "A rollback needs a reason.");
  const at = now.toISOString();
  const remaining = all.filter((v) => v.id !== version.id);
  const before = resolveActive(args.seedFee?.amount ?? null, all, now);
  const after = resolveActive(args.seedFee?.amount ?? null, remaining, now);
  return {
    versionPatch: {
      status: "rolled-back" as const,
      rolledBackAt: at,
      rolledBackBy: reviewerId,
      rollbackReason: args.reason.trim(),
    },
    candidateStatus: "rolled-back" as CandidateStatus,
    restored: { value: after.value, version: after.version },
    audit: {
      at,
      actor: reviewerId,
      actorKind: "admin" as const,
      action: "version_rolled_back" as const,
      entityId: version.entityId,
      candidateId: version.candidateId,
      versionId: version.id,
      details: {
        rolledBackVersion: version.version,
        valueRemoved: version.value,
        restoredVersion: after.version,
        restoredValue: after.value,
        activeBefore: before.value,
        reason: args.reason.trim(),
      },
    } satisfies AuditEntry,
  };
}

/** A scheduled candidate whose date has arrived is, in effect, published. No job required. */
export function displayStatus(
  c: Pick<ChangeCandidate, "status" | "effectiveFrom">,
  now: Date,
): CandidateStatus {
  if (
    c.status === "scheduled" &&
    c.effectiveFrom &&
    new Date(c.effectiveFrom).getTime() <= now.getTime()
  )
    return "published";
  return c.status;
}

export type HistoryRow = {
  version: number;
  value: number | null;
  status: "seed" | "active" | "upcoming" | "superseded" | "rolled-back";
  from: string | null;
  until: string | null;
  sourceId: string | null;
  id: string | null;
};

/** Full version history for one entity, newest first. Nothing is ever dropped. */
export function buildHistory(
  seedValue: number | null,
  seedFrom: string | null,
  versions: KnowledgeVersion[],
  now: Date,
): HistoryRow[] {
  const res = resolveActive(seedValue, versions, now);
  const rows: HistoryRow[] = versions.map((v) => ({
    version: v.version,
    value: v.value,
    status:
      v.status === "rolled-back"
        ? "rolled-back"
        : res.record?.id === (v as unknown as { id: string }).id
          ? "active"
          : startsAt(v) > now.getTime()
            ? "upcoming"
            : "superseded",
    from: v.effectiveFrom ?? v.approvedAt ?? v.createdAt,
    until: v.effectiveUntil,
    sourceId: v.sourceId,
    id: (v as unknown as { id: string }).id ?? null,
  }));
  rows.push({
    version: 1,
    value: seedValue,
    status: res.source === "seed" ? "seed" : "superseded",
    from: seedFrom,
    until: null,
    sourceId: null,
    id: null,
  });
  return rows.sort((a, b) => b.version - a.version);
}
