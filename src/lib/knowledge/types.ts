/**
 * Raasta verified-knowledge types.
 *
 * Every factual record carries provenance: which source it came from, what we
 * can honestly say about its verification, and when (if ever) it was checked.
 * Nothing in this file is "truth" — it is the shape that lets the rest of the
 * system refuse to treat unverified data as verified.
 */

export type Lang = "en" | "ur" | "roman";

/** Text with optional translations. Missing translations fall back to English. */
export type Localized = { en: string; ur?: string; roman?: string };

export function pick(text: Localized | undefined, lang: Lang): string {
  if (!text) return "";
  return text[lang] ?? text.en;
}

export type JurisdictionId = "federal" | "ict" | "punjab" | "sindh" | "kp" | "balochistan";

/**
 * Verification states. They are deliberately distinct:
 *  - verified            a human checked this against the governing official source
 *  - official_source     taken from an official page; page was read, currency not independently confirmed
 *  - needs_confirmation  compiled/derived or possibly stale; confirm with the department
 *  - not_verified        Raasta has no confirmed value and will not guess
 *  - user_provided       came from the user, never promoted to verified
 */
export type VerificationStatus =
  "verified" | "official_source" | "needs_confirmation" | "not_verified" | "user_provided";

export type SourceKind =
  "notification" | "service_page" | "form" | "faq" | "portal" | "helpline" | "home";

export type Provenance = {
  sourceId: string | null;
  verificationStatus: VerificationStatus;
  /** ISO date. Only set when a person or tool actually re-read the source on that day. */
  lastCheckedAt: string | null;
  /** ISO date a human confirmed the value. Never set by automation. */
  lastVerifiedAt: string | null;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  /** How we know what we know, in one honest sentence. */
  basis: string;
  notes?: string;
};

export type AgencyRecord = {
  id: string;
  name: string;
  fullName: string;
  officialDomain: string | null;
};

export type SourceRecord = Provenance & {
  id: string;
  title: string;
  url: string;
  agencyId: string;
  jurisdictionId: JurisdictionId;
  kind: SourceKind;
  /** Registered on a .gov.pk (or equivalent) domain operated by the agency. */
  official: boolean;
  /** 1 = notification/service page/form, 2 = FAQ/home page. Lower number wins in a conflict. */
  priority: 1 | 2 | 3 | 4;
};

export type FeeRecord = Provenance & {
  id: string;
  serviceId: string;
  jurisdictionId: JurisdictionId;
  category: string;
  label: Localized;
  /** null means "no confirmed amount exists" — never filled with a guess. */
  amount: number | null;
  currency: "PKR";
  /** Published processing target. */
  processingDays: number | null;
  processingUnit?: "days" | "working_days";
  processingVerification?: VerificationStatus;
  /** Which answers select this fee, e.g. { vehicleType: "car", vehicleBand: "1000" } */
  match: Record<string, string>;
  /** Shown by default (others sit behind "show all"). */
  primary?: boolean;
  /** Superseded by a newer notification. Never displayed as current; only kept for conflict handling. */
  historical?: boolean;
  supersededBy?: string;
  caveat?: Localized;
  /** Set by the version overlay: an approved change that is not yet in effect. */
  upcoming?: { amount: number; effectiveFrom: string };
  /** Set by the version overlay: which knowledge version supplies `amount` (1 = seeded baseline). */
  activeVersion?: number;
};

export type RequirementRecord = Provenance & {
  id: string;
  serviceId: string;
  jurisdictionId: JurisdictionId;
  kind: "document" | "form" | "condition";
  label: Localized;
  detail?: Localized;
  /** Counts toward readiness. Non-required items show under "if this applies to you". */
  required: boolean;
  /** For conditional documents, the group they belong to. */
  group?: "core" | "other-district" | "leased";
  /** Journey step this requirement belongs to. */
  stepId: string;
  /** Action that helps the user obtain it (e.g. download the form). */
  actionId?: string;
};

export type StepKind = "confirm" | "prepare" | "verify" | "act" | "track";

export type ProcedureStep = Provenance & {
  id: string;
  serviceId: string;
  jurisdictionId: JurisdictionId;
  order: number;
  kind: StepKind;
  title: Localized;
  detail: Localized;
  actionIds?: string[];
  /** A Raasta navigation step that makes no factual claim, so it shows no verification badge. */
  guidance?: boolean;
};

export type ActionKind =
  "open_portal" | "download_form" | "call" | "find_office" | "fee_calculator" | "open_page";

export type ActionRecord = Provenance & {
  id: string;
  serviceId: string;
  jurisdictionId: JurisdictionId;
  kind: ActionKind;
  label: Localized;
  /** https:// or tel: only. */
  url: string;
};

export type OfficeRecord = Provenance & {
  id: string;
  serviceId: string;
  jurisdictionId: JurisdictionId;
  name: Localized;
  address: string;
  city: string;
  /** null = "Hours not currently verified." */
  hours: Localized | null;
  phone: string | null;
  email: string | null;
};

export type WarningRecord = Provenance & {
  id: string;
  serviceId: string;
  jurisdictionId: JurisdictionId;
  tone: "info" | "caution";
  text: Localized;
  /** Show only when these answers match. */
  when?: Record<string, string>;
};

export type TimelineRecord = Provenance & {
  id: string;
  serviceId: string;
  jurisdictionId: JurisdictionId;
  text: Localized;
};

export type ClarifierOption = {
  value: string;
  label: Localized;
  /** Lowercase tokens that let the fallback router detect this answer in free text. */ keywords?: string[];
};

export type Clarifier = {
  /** Answer key, e.g. "jurisdiction", "vehicleType". */
  key: string;
  question: Localized;
  options: ClarifierOption[];
  /** Blocking questions must be answered before a journey is generated. */
  blocking: boolean;
  /** Only ask when another answer has this value. */
  dependsOn?: { key: string; value: string };
};

export type ServiceCategory =
  "identity" | "travel" | "vehicles" | "licences" | "taxes" | "certificates" | "other";

export type ServiceIcon = "id" | "plane" | "car" | "file" | "receipt" | "shield" | "home" | "alert";

export type ServiceRecord = {
  id: string;
  slug: string;
  name: Localized;
  agencyId: string;
  category: ServiceCategory;
  icon: ServiceIcon;
  summary: Localized;
  /** Jurisdictions for which Raasta holds information. */
  jurisdictions: JurisdictionId[];
  /** Whether the service's rules vary by jurisdiction (so we must ask when unknown). */
  jurisdictionSensitive: boolean;
  online: "full" | "partial" | "offline";
  scenarios: string[];
  clarifiers: Clarifier[];
  /** Answer keys that must be known before the "confirm" step counts as done. */
  confirmKeys?: string[];
  /** Keywords for the deterministic fallback router (lowercase). */
  keywords: string[];
  helplineActionId?: string;
};

export type JurisdictionRecord = {
  id: JurisdictionId;
  name: Localized;
  /** Lowercase tokens that identify this jurisdiction in free text. */
  keywords: string[];
};

export const VERIFICATION_ORDER: VerificationStatus[] = [
  "verified",
  "official_source",
  "needs_confirmation",
  "user_provided",
  "not_verified",
];

export function isTrusted(status: VerificationStatus): boolean {
  return status === "verified" || status === "official_source";
}
