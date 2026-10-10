import {
  KNOWLEDGE_VERSION,
  collectSources,
  defaultJurisdiction,
  getAgency,
  getActions,
  getJurisdiction,
  getOffices,
  getRequirements,
  getService,
  getSteps,
  getTimelines,
  getWarnings,
  linkOrigin,
  nextClarifier,
  getFeesForService,
  selectFeesFrom,
  supportsJurisdiction,
  type ActionRecord,
  type Answers,
  type JurisdictionId,
} from "../knowledge";
import { applyOverlayToFees } from "../freshness/versions";
import type { PublishedVersion } from "../freshness/types";
import { computeReadiness, countsTowardReadiness } from "./readiness";
import {
  EMPTY_STATE,
  type Journey,
  type JourneyInput,
  type JourneyRequirement,
  type JourneyState,
  type JourneyStep,
  type StepStatus,
} from "./types";

export class JourneyError extends Error {
  constructor(
    public code: "unknown_service" | "unsupported_jurisdiction" | "no_steps",
    message: string,
  ) {
    super(message);
    this.name = "JourneyError";
  }
}

/** A step's own requirements, after the user's "this applies to me" choices. */
function stepRequirements(all: JourneyRequirement[], stepId: string): JourneyRequirement[] {
  return all.filter((r) => r.record.stepId === stepId);
}

/**
 * Build the full journey view-model from IDs + the user's own progress.
 * Pure and deterministic: the same input and state always produce the same
 * journey, and every fact in it is read from the verified knowledge layer.
 */
export type BuildOptions = {
  /** Approved, published knowledge versions. Pending or rejected data must never be passed here. */
  versions?: PublishedVersion[];
  now?: Date;
};

export function buildJourney(
  input: JourneyInput,
  state: JourneyState = EMPTY_STATE,
  opts: BuildOptions = {},
): Journey {
  const service = getService(input.serviceId);
  if (!service) throw new JourneyError("unknown_service", `Unknown service: ${input.serviceId}`);
  if (!supportsJurisdiction(service, input.jurisdictionId)) {
    throw new JourneyError(
      "unsupported_jurisdiction",
      `${service.id} has no verified information for ${input.jurisdictionId}`,
    );
  }

  const { serviceId, jurisdictionId, answers } = input;
  const stepRecords = getSteps(serviceId, jurisdictionId);
  if (stepRecords.length === 0) throw new JourneyError("no_steps", `No steps for ${serviceId}`);

  const requirements: JourneyRequirement[] = getRequirements(serviceId, jurisdictionId).map(
    (record) => ({
      record,
      status: state.checklist[record.id] ?? "pending",
      counts: countsTowardReadiness(record, state),
    }),
  );
  const readiness = computeReadiness(
    requirements.map((r) => r.record),
    state,
  );

  const actionIndex = new Map<string, ActionRecord>(
    getActions(serviceId, jurisdictionId).map((a) => [a.id, a]),
  );
  const confirmKeys = service.confirmKeys ?? [];
  const jurisdictionConfirmed =
    answers["jurisdiction"] !== undefined || defaultJurisdiction(service) !== null;

  // ---- derive each step's completion -------------------------------------------
  const baseDone = stepRecords.map((rec): "completed" | "skipped" | null => {
    const override = state.stepOverrides[rec.id];
    if (override) return override;
    const reqs = stepRequirements(requirements, rec.id).filter((r) => r.counts);
    if (rec.kind === "confirm") {
      return jurisdictionConfirmed && confirmKeys.every((k) => answers[k] !== undefined)
        ? "completed"
        : null;
    }
    // Preparing and verifying complete themselves once every counted item is ready.
    if ((rec.kind === "prepare" || rec.kind === "verify") && reqs.length > 0) {
      return reqs.every((r) => r.status === "ready") ? "completed" : null;
    }
    return null;
  });

  const currentIndex = baseDone.findIndex((d) => d === null);
  const isComplete = currentIndex === -1;

  const steps: JourneyStep[] = stepRecords.map((record, index) => {
    const reqs = stepRequirements(requirements, record.id);
    const counted = reqs.filter((r) => r.counts);
    const done = baseDone[index] ?? null;

    let status: StepStatus;
    if (done === "skipped") status = "skipped";
    else if (done === "completed") status = "completed";
    else if (index !== currentIndex) status = "locked";
    else if (counted.some((r) => r.status === "unavailable")) status = "blocked";
    else if (counted.some((r) => r.status === "attention")) status = "needs-attention";
    else if (record.verificationStatus === "not_verified") status = "not-verified";
    else status = "current";

    const actions = (record.actionIds ?? [])
      .map((id) => actionIndex.get(id))
      .filter((a): a is ActionRecord => !!a);

    return {
      record,
      index,
      status,
      requirements: reqs,
      actions,
      note: state.notes[record.id] ?? "",
    };
  });

  const completedCount = steps.filter(
    (s) => s.status === "completed" || s.status === "skipped",
  ).length;
  const fees = selectFeesFrom(
    applyOverlayToFees(
      getFeesForService(serviceId, jurisdictionId),
      opts.versions ?? [],
      opts.now ?? new Date(),
    ),
    answers,
  );

  const warnings = getWarnings(serviceId, jurisdictionId);
  const timelines = getTimelines(serviceId, jurisdictionId);
  const offices = getOffices(serviceId, jurisdictionId);
  const actions = getActions(serviceId, jurisdictionId);

  const sources = collectSources([
    ...steps.map((s) => s.record),
    ...requirements.map((r) => r.record),
    ...fees.shown,
    ...warnings,
    ...timelines,
    ...offices,
    ...actions,
  ]);

  const agency = getAgency(service.agencyId);
  const jurisdiction = getJurisdiction(jurisdictionId);

  return {
    input,
    serviceName: service.name,
    agencyName: agency?.name ?? service.agencyId,
    jurisdictionName: jurisdiction?.name ?? { en: jurisdictionId },
    steps,
    currentIndex,
    completedCount,
    totalSteps: steps.length,
    progress: steps.length === 0 ? 0 : completedCount / steps.length,
    isComplete,
    readiness,
    requirements,
    fees,
    warnings,
    timelines,
    offices,
    actions,
    sources,
    pendingClarifier: nextClarifier(service, answers),
    knowledgeVersion: KNOWLEDGE_VERSION,
  };
}

/** Apply one answer and return new input (does not mutate). */
export function withAnswer(input: JourneyInput, key: string, value: string): JourneyInput {
  const answers: Answers = { ...input.answers, [key]: value };
  // Changing a parent answer invalidates answers that depended on it.
  if (key === "vehicleType") delete answers["vehicleBand"];
  return { ...input, answers };
}

export function emptyJourneyInput(
  serviceId: string,
  jurisdictionId: JurisdictionId,
  answers: Answers = {},
): JourneyInput {
  return { serviceId, jurisdictionId, answers };
}

/** The primary action for the journey's current step, if one exists. */
export function primaryActionFor(journey: Journey): ActionRecord | null {
  const step = journey.steps[journey.currentIndex];
  if (!step) return null;
  // The main button should lead to a government source (or a helpline); a
  // third-party convenience such as a map link is only ever a fallback.
  const lead = step.actions.find((a) => linkOrigin(a.url) !== "third_party") ?? step.actions[0];
  if (lead) return lead;
  for (const req of step.requirements) {
    if (req.status !== "ready" && req.record.actionId) {
      const found = journey.actions.find((a) => a.id === req.record.actionId);
      if (found) return found;
    }
  }
  return null;
}
