/**
 * Raasta verified-knowledge layer — public API.
 *
 * Everything the UI or the grounding layer shows as a fact is read through
 * this module. The model never supplies facts; it supplies IDs, and the
 * resolvers below accept or reject them.
 */
import type {
  ActionRecord,
  Clarifier,
  FeeRecord,
  JurisdictionId,
  OfficeRecord,
  ProcedureStep,
  RequirementRecord,
  ServiceRecord,
  SourceRecord,
  TimelineRecord,
  WarningRecord,
} from "./types";
import { AGENCY_RECORDS, getAgency } from "./agencies";
import { FEES } from "./fees";
import { ACTIONS, OFFICES, directionsUrl } from "./offices";
import { REQUIREMENTS } from "./documents";
import { PROCEDURE_STEPS, TIMELINES, WARNINGS } from "./procedures";
import { SERVICE_RECORDS, PRIMARY_SLUGS } from "./services";
import { SOURCES, getSource, preferSource } from "./sources";
import { JURISDICTIONS, getJurisdiction, isJurisdictionId } from "./jurisdictions";
import { assertConsistent } from "./verification";

export * from "./types";
export * from "./verification";
export * from "./origin";
export {
  AGENCY_RECORDS,
  getAgency,
  SOURCES,
  getSource,
  preferSource,
  JURISDICTIONS,
  getJurisdiction,
  isJurisdictionId,
  PRIMARY_SLUGS,
  directionsUrl,
};
export {
  FEES,
  ACTIONS,
  OFFICES,
  REQUIREMENTS,
  PROCEDURE_STEPS,
  TIMELINES,
  WARNINGS,
  SERVICE_RECORDS,
};

/** Bump whenever any record changes, so saved journeys can tell the facts moved. */
export const KNOWLEDGE_VERSION = "2026-10-07.1";

// ---------------------------------------------------------------- services --

export function listServices(): ServiceRecord[] {
  return SERVICE_RECORDS;
}

export function getService(slug: string | null | undefined): ServiceRecord | undefined {
  if (!slug) return undefined;
  return SERVICE_RECORDS.find((s) => s.slug === slug || s.id === slug);
}

export type Answers = Record<string, string>;

export function supportsJurisdiction(
  service: ServiceRecord,
  jurisdictionId: JurisdictionId,
): boolean {
  return service.jurisdictions.includes(jurisdictionId);
}

/** The jurisdiction to use when the user never had a choice (single-jurisdiction services). */
export function defaultJurisdiction(service: ServiceRecord): JurisdictionId | null {
  return service.jurisdictions.length === 1 ? (service.jurisdictions[0] ?? null) : null;
}

/** Next question worth asking, or null. Blocking questions come first. */
export function nextClarifier(
  service: ServiceRecord,
  answers: Answers,
  opts: { blockingOnly?: boolean } = {},
): Clarifier | null {
  const applicable = service.clarifiers.filter((c) => {
    if (answers[c.key] !== undefined) return false;
    if (c.dependsOn && answers[c.dependsOn.key] !== c.dependsOn.value) return false;
    return !opts.blockingOnly || c.blocking;
  });
  return applicable.find((c) => c.blocking) ?? applicable[0] ?? null;
}

/** Validate that an answer is one of the clarifier's real options. */
export function isValidAnswer(service: ServiceRecord, key: string, value: string): boolean {
  return service.clarifiers.some((c) => c.key === key && c.options.some((o) => o.value === value));
}

// ----------------------------------------------------------------- records --

function forService<T extends { serviceId: string; jurisdictionId: JurisdictionId }>(
  list: T[],
  serviceId: string,
  jurisdictionId: JurisdictionId,
): T[] {
  return list.filter((r) => r.serviceId === serviceId && r.jurisdictionId === jurisdictionId);
}

export const getSteps = (s: string, j: JurisdictionId): ProcedureStep[] =>
  forService(PROCEDURE_STEPS, s, j).sort((a, b) => a.order - b.order);
export const getRequirements = (s: string, j: JurisdictionId): RequirementRecord[] =>
  forService(REQUIREMENTS, s, j);
export const getActions = (s: string, j: JurisdictionId): ActionRecord[] =>
  forService(ACTIONS, s, j);
export const getOffices = (s: string, j: JurisdictionId): OfficeRecord[] =>
  forService(OFFICES, s, j);
export const getWarnings = (s: string, j: JurisdictionId): WarningRecord[] =>
  forService(WARNINGS, s, j);
export const getTimelines = (s: string, j: JurisdictionId): TimelineRecord[] =>
  forService(TIMELINES, s, j);

export function getFeesForService(serviceId: string, jurisdictionId: JurisdictionId): FeeRecord[] {
  return forService(FEES, serviceId, jurisdictionId).filter((f) => !f.historical);
}

/**
 * Choose which fees to show given the user's answers.
 *  - Fees contradicted by an answer are excluded.
 *  - If any fee matches the answers, show those (plus always-applicable fees).
 *  - Otherwise show the primary fees and tuck the rest behind "show all".
 */
export function selectFees(
  serviceId: string,
  jurisdictionId: JurisdictionId,
  answers: Answers,
): { shown: FeeRecord[]; others: FeeRecord[]; narrowed: boolean } {
  return selectFeesFrom(getFeesForService(serviceId, jurisdictionId), answers);
}

/** Same selection over an explicit list (e.g. fees with approved versions applied). */
export function selectFeesFrom(
  all: FeeRecord[],
  answers: Answers,
): { shown: FeeRecord[]; others: FeeRecord[]; narrowed: boolean } {
  const pool = all.filter((f) =>
    Object.entries(f.match).every(([k, v]) => answers[k] === undefined || answers[k] === v),
  );
  const touched = (f: FeeRecord) => Object.entries(f.match).some(([k, v]) => answers[k] === v);
  const general = (f: FeeRecord) => Object.keys(f.match).length === 0;

  const touchedFees = pool.filter(touched);
  const shown = touchedFees.length
    ? [...touchedFees, ...pool.filter((f) => general(f) && f.primary)]
    : pool.filter((f) => f.primary);
  const shownIds = new Set(shown.map((f) => f.id));
  const others = all.filter((f) => !shownIds.has(f.id));
  return { shown, others, narrowed: touchedFees.length > 0 };
}

// ----------------------------------------------------------------- resolvers --

export type Rejection = "unknown" | "superseded" | "jurisdiction_mismatch" | "service_mismatch";
export type Resolved<T> = { ok: true; record: T } | { ok: false; reason: Rejection };

type Scope = { serviceId: string; jurisdictionId: JurisdictionId };

function resolveScoped<
  T extends { id: string; serviceId: string; jurisdictionId: JurisdictionId; historical?: boolean },
>(list: T[], id: string, scope: Scope): Resolved<T> {
  const record = list.find((r) => r.id === id);
  if (!record) return { ok: false, reason: "unknown" };
  if (record.serviceId !== scope.serviceId) return { ok: false, reason: "service_mismatch" };
  if (record.jurisdictionId !== scope.jurisdictionId)
    return { ok: false, reason: "jurisdiction_mismatch" };
  if (record.historical) return { ok: false, reason: "superseded" };
  return { ok: true, record };
}

export const resolveFeeId = (id: string, scope: Scope) => resolveScoped(FEES, id, scope);
export const resolveRequirementId = (id: string, scope: Scope) =>
  resolveScoped(REQUIREMENTS, id, scope);
export const resolveStepId = (id: string, scope: Scope) =>
  resolveScoped(PROCEDURE_STEPS, id, scope);
export const resolveActionId = (id: string, scope: Scope) => resolveScoped(ACTIONS, id, scope);
export const resolveOfficeId = (id: string, scope: Scope) => resolveScoped(OFFICES, id, scope);

export function resolveSourceId(id: string): Resolved<SourceRecord> {
  const record = getSource(id);
  return record ? { ok: true, record } : { ok: false, reason: "unknown" };
}

/** Distinct sources cited by a set of records, most authoritative first. */
export function collectSources(records: Array<{ sourceId: string | null }>): SourceRecord[] {
  const ids = Array.from(new Set(records.map((r) => r.sourceId).filter((x): x is string => !!x)));
  return ids
    .map((id) => getSource(id))
    .filter((s): s is SourceRecord => !!s)
    .sort((a, b) => a.priority - b.priority);
}

// ------------------------------------------------------------------ integrity --

/** Returns human-readable problems; the test suite requires this to be empty. */
export function validateKnowledge(): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const all = [
    ...FEES,
    ...REQUIREMENTS,
    ...PROCEDURE_STEPS,
    ...ACTIONS,
    ...OFFICES,
    ...WARNINGS,
    ...TIMELINES,
  ];

  for (const r of all) {
    if (ids.has(r.id)) problems.push(`Duplicate id ${r.id}`);
    ids.add(r.id);
    if (r.sourceId && !getSource(r.sourceId))
      problems.push(`${r.id} cites unknown source ${r.sourceId}`);
    for (const p of assertConsistent(r as never)) problems.push(`${r.id}: ${p}`);
    const service = getService(r.serviceId);
    if (!service) problems.push(`${r.id} references unknown service ${r.serviceId}`);
    else if (!service.jurisdictions.includes(r.jurisdictionId)) {
      problems.push(
        `${r.id} uses jurisdiction ${r.jurisdictionId} not supported by ${r.serviceId}`,
      );
    }
  }

  for (const s of SOURCES) {
    if (ids.has(s.id)) problems.push(`Source id collides with record id: ${s.id}`);
    if (!getAgency(s.agencyId)) problems.push(`${s.id} references unknown agency ${s.agencyId}`);
    if (!/^(https:\/\/|tel:)/.test(s.url)) problems.push(`${s.id} has a non-https/tel url`);
    if (s.lastVerifiedAt)
      problems.push(`${s.id} carries lastVerifiedAt; only a dated human check may set it`);
  }
  for (const a of ACTIONS) {
    if (!/^(https:\/\/|tel:)/.test(a.url)) problems.push(`${a.id} has a non-https/tel url`);
  }
  for (const f of FEES) {
    if (f.historical && !f.supersededBy)
      problems.push(`${f.id} is historical but has no supersededBy`);
    if (f.supersededBy && !FEES.some((x) => x.id === f.supersededBy))
      problems.push(`${f.id} supersededBy is unknown`);
  }
  for (const r of REQUIREMENTS) {
    if (!PROCEDURE_STEPS.some((st) => st.id === r.stepId))
      problems.push(`${r.id} points at missing step ${r.stepId}`);
    if (r.actionId && !ACTIONS.some((a) => a.id === r.actionId))
      problems.push(`${r.id} points at missing action ${r.actionId}`);
  }
  for (const st of PROCEDURE_STEPS) {
    for (const aid of st.actionIds ?? []) {
      if (!ACTIONS.some((a) => a.id === aid))
        problems.push(`${st.id} points at missing action ${aid}`);
    }
  }
  return problems;
}

// ----------------------------------------------------------- Lists for forms --

export const DEPARTMENTS = [
  "NADRA",
  "DGI&P (Passports)",
  "Excise & Taxation",
  "FBR",
  "Police",
  "District administration",
  "Utility company (electricity, gas, water)",
  "Other",
];

export const COMPLAINT_CATEGORIES = [
  "Long delay",
  "Asked for a bribe",
  "Rude or unhelpful staff",
  "Wrong information given",
  "Online system not working",
  "Other",
];
