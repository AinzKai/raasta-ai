import type {
  ActionRecord,
  Answers,
  Clarifier,
  FeeRecord,
  JurisdictionId,
  Localized,
  OfficeRecord,
  ProcedureStep,
  RequirementRecord,
  SourceRecord,
  TimelineRecord,
  WarningRecord,
} from "../knowledge";

export type StepStatus =
  "locked" | "current" | "completed" | "needs-attention" | "not-verified" | "skipped" | "blocked";

/** What the user says about a requirement. Absence means "not yet answered". */
export type ChecklistStatus = "ready" | "attention" | "unavailable";

/** Everything that identifies a journey. Facts are NOT stored — only IDs and answers. */
export type JourneyInput = {
  serviceId: string;
  jurisdictionId: JurisdictionId;
  answers: Answers;
};

/** The user's own progress. This is the only mutable part of a journey. */
export type JourneyState = {
  checklist: Record<string, ChecklistStatus>;
  /** Optional requirements the user says apply to them. They then count toward readiness. */
  applies: Record<string, boolean>;
  stepOverrides: Record<string, "completed" | "skipped">;
  notes: Record<string, string>;
};

export const EMPTY_STATE: JourneyState = {
  checklist: {},
  applies: {},
  stepOverrides: {},
  notes: {},
};

export type JourneyRequirement = {
  record: RequirementRecord;
  status: ChecklistStatus | "pending";
  counts: boolean;
};

export type JourneyStep = {
  record: ProcedureStep;
  index: number;
  status: StepStatus;
  requirements: JourneyRequirement[];
  actions: ActionRecord[];
  note: string;
};

export type Readiness = {
  total: number;
  ready: number;
  /** 0–100, computed as ready / total. Never produced by a model. */
  percent: number;
  remaining: number;
  attention: RequirementRecord[];
  unavailable: RequirementRecord[];
  pending: RequirementRecord[];
  level: "not-started" | "in-progress" | "almost" | "ready" | "blocked";
};

export type Journey = {
  input: JourneyInput;
  serviceName: Localized;
  agencyName: string;
  jurisdictionName: Localized;
  steps: JourneyStep[];
  currentIndex: number;
  completedCount: number;
  totalSteps: number;
  progress: number;
  isComplete: boolean;
  readiness: Readiness;
  requirements: JourneyRequirement[];
  fees: { shown: FeeRecord[]; others: FeeRecord[]; narrowed: boolean };
  warnings: WarningRecord[];
  timelines: TimelineRecord[];
  offices: OfficeRecord[];
  actions: ActionRecord[];
  sources: SourceRecord[];
  pendingClarifier: Clarifier | null;
  knowledgeVersion: string;
};

export type SavedJourney = {
  id: string;
  input: JourneyInput;
  state: JourneyState;
  status: "active" | "completed" | "archived";
  title: string;
  knowledgeVersion: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
