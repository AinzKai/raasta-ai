import { isTrusted, pick, type Lang, type Provenance, type VerificationStatus } from "./types";
import { getSource } from "./sources";

type Meta = { label: Record<Lang, string>; short: Record<Lang, string> };

export const STATUS_META: Record<VerificationStatus, Meta> = {
  verified: {
    label: { en: "Verified", ur: "تصدیق شدہ", roman: "Verified" },
    short: {
      en: "A person at Raasta checked this against the official source on the date shown.",
      ur: "راستہ کے ایک فرد نے درج تاریخ پر سرکاری ماخذ سے اس کی جانچ کی۔",
      roman: "Raasta ke aik fard ne darj tareekh par official source se iski jaanch ki.",
    },
  },
  official_source: {
    label: { en: "Official source", ur: "سرکاری ماخذ", roman: "Official source" },
    short: {
      en: "Based on an official government source. No dated check by a person is on file, so confirm with the office before you pay.",
      ur: "سرکاری ماخذ پر مبنی۔ کسی فرد کی تاریخ وار جانچ درج نہیں، اس لیے ادائیگی سے پہلے دفتر سے تصدیق کر لیں۔",
      roman:
        "Official government source par mabni. Kisi fard ki dated jaanch darj nahi, is liye payment se pehle office se tasdeeq kar lein.",
    },
  },
  needs_confirmation: {
    label: { en: "Needs confirmation", ur: "تصدیق درکار", roman: "Tasdeeq darkaar" },
    short: {
      en: "Compiled or possibly out of date. Confirm with the department.",
      ur: "مرتب شدہ یا پرانی ہو سکتی ہے۔ محکمے سے تصدیق کریں۔",
      roman: "Murattab shuda ya purani ho sakti hai. Mehkame se tasdeeq karein.",
    },
  },
  not_verified: {
    label: {
      en: "Not currently verified",
      ur: "فی الحال تصدیق شدہ نہیں",
      roman: "Filhaal tasdeeq shuda nahi",
    },
    short: {
      en: "Raasta has no confirmed value and will not guess.",
      ur: "راستہ کے پاس تصدیق شدہ قدر نہیں، اندازہ نہیں لگائے گا۔",
      roman: "Raasta ke paas tasdeeq shuda value nahi, andaza nahi lagayega.",
    },
  },
  user_provided: {
    label: { en: "You told us", ur: "آپ نے بتایا", roman: "Aap ne bataya" },
    short: {
      en: "Provided by you. Raasta has not verified it.",
      ur: "آپ نے فراہم کیا۔ راستہ نے اس کی تصدیق نہیں کی۔",
      roman: "Aap ne diya. Raasta ne is ki tasdeeq nahi ki.",
    },
  },
};

export function statusLabel(status: VerificationStatus, lang: Lang): string {
  return pick(STATUS_META[status].label, lang);
}

export function statusExplanation(status: VerificationStatus, lang: Lang): string {
  return pick(STATUS_META[status].short, lang);
}

/**
 * The status we are willing to show for a record. A record can never display
 * as trusted unless its cited source exists, and cannot be MORE trusted than
 * the weakest link we can detect.
 */
const MS_DAY = 86_400_000;
/** Beyond this many days since anyone read the source, trust is downgraded to "needs confirmation". */
export const STALE_DOWNGRADE_DAYS = 90;

function ageDays(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).getTime();
  return Number.isNaN(t) ? null : Math.floor((now.getTime() - t) / MS_DAY);
}

export function effectiveStatus(record: Provenance, now?: Date): VerificationStatus {
  const base = baseEffectiveStatus(record);
  if (!now || !isTrusted(base)) return base;
  // A human-verified date keeps its trust; otherwise an old, unrefreshed read must not look current.
  const last =
    record.lastVerifiedAt ??
    record.lastCheckedAt ??
    getSource(record.sourceId)?.lastCheckedAt ??
    null;
  const age = ageDays(last, now);
  return age !== null && age > STALE_DOWNGRADE_DAYS ? "needs_confirmation" : base;
}

function baseEffectiveStatus(record: Provenance): VerificationStatus {
  // "Verified" means a person confirmed the value on a recorded date. A record
  // that claims it without that date is at most backed by an official source —
  // it is never shown as verified, whatever its stored status says.
  const claimed: VerificationStatus =
    record.verificationStatus === "verified" && !record.lastVerifiedAt
      ? "official_source"
      : record.verificationStatus;
  if (record.sourceId) {
    const src = getSource(record.sourceId);
    if (!src) return "not_verified";
    if (isTrusted(claimed) && !isTrusted(src.verificationStatus)) {
      return src.verificationStatus;
    }
  }
  return claimed;
}

/** Records with no usable value must never present as trusted. */
export function assertConsistent(record: Provenance & { amount?: number | null }): string[] {
  const problems: string[] = [];
  if (record.amount === null && isTrusted(record.verificationStatus)) {
    problems.push("A record without an amount cannot be verified.");
  }
  if (isTrusted(record.verificationStatus) && !record.sourceId) {
    problems.push("A verified/official record must cite a source.");
  }
  if (record.verificationStatus === "verified" && !record.lastVerifiedAt) {
    problems.push("A verified record needs a dated human check (lastVerifiedAt).");
  }
  if (
    record.lastVerifiedAt &&
    !record.lastCheckedAt &&
    record.verificationStatus === "not_verified"
  ) {
    problems.push("A not_verified record cannot carry a verification date.");
  }
  return problems;
}
