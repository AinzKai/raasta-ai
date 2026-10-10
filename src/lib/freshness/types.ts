/** Knowledge freshness & governance types. */

export type CandidateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs-investigation"
  | "scheduled"
  | "published"
  | "superseded"
  | "rolled-back";

export type CandidateKind = "value_change" | "source_change";
export type Extraction = "ai" | "manual" | "fixture" | "none";

/** Only these facts can be versioned today. Extending this is a deliberate act. */
export type VersionedField = "amount";
export type EntityType = "fee";

export type SourceEvidence = {
  /** A verbatim excerpt of the normalized source text. Never generated. */
  quote: string | null;
  url: string;
  addedFacts: string[];
  removedFacts: string[];
  textHash: string | null;
};

export type ChangeCandidate = {
  id: string;
  kind: CandidateKind;
  sourceId: string;
  serviceId: string | null;
  entityId: string | null;
  jurisdictionId: string | null;
  field: VersionedField | null;
  oldValue: number | null;
  proposedValue: number | null;
  detectedAt: string;
  confidence: number;
  sourceEvidence: SourceEvidence;
  status: CandidateStatus;
  extraction: Extraction;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
};

export type VersionStatus = "published" | "rolled-back";

export type KnowledgeVersion = {
  id: string;
  entityType: EntityType;
  entityId: string;
  field: VersionedField;
  /** v1 is the seeded baseline in code; database versions start at 2. */
  version: number;
  value: number;
  status: VersionStatus;
  /** null = effective from publication (an explicit reviewer decision, recorded in the audit log). */
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  sourceId: string;
  candidateId: string | null;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rolledBackAt: string | null;
  rolledBackBy: string | null;
  rollbackReason: string | null;
};

/** The public, minimal view of a published version. No reviewer identities or internal ids. */
export type PublishedVersion = Pick<
  KnowledgeVersion,
  | "entityId"
  | "field"
  | "version"
  | "value"
  | "effectiveFrom"
  | "effectiveUntil"
  | "createdAt"
  | "approvedAt"
> & { sourceId: string };

export type AuditEntry = {
  at: string;
  actor: string | null;
  actorKind: "system" | "admin";
  action:
    | "candidate_created"
    | "candidate_approved"
    | "candidate_rejected"
    | "candidate_needs_investigation"
    | "version_published"
    | "version_rolled_back"
    | "conflict_opened"
    | "conflict_resolved"
    | "source_flagged";
  entityId: string | null;
  candidateId: string | null;
  versionId: string | null;
  details: Record<string, unknown>;
};

export type SourceFrequency = "daily" | "weekly" | "monthly" | "manual";
export type SourceType =
  | "official-webpage"
  | "official-pdf"
  | "official-notification"
  | "official-form"
  | "official-api"
  | "other";
export type MonitoredStatus = "verified" | "needs-review" | "stale" | "unreachable" | "deprecated";

export type SourceState = {
  sourceId: string;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastVerifiedAt: string | null;
  lastChangedAt: string | null;
  lastContentHash: string | null;
  lastHttpStatus: number | null;
  consecutiveFailures: number;
  reviewRequired: boolean;
  /** Raasta may not fetch this source automatically (robots, no stable page, phone number…). */
  manualOnly: boolean;
  manualReason: string | null;
};
