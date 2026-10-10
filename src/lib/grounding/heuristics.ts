import {
  JURISDICTIONS,
  getService,
  listServices,
  type Answers,
  type JurisdictionId,
  type Lang,
  type ServiceRecord,
} from "../knowledge";
import type { RouterOutput } from "./schema";

/**
 * Deterministic fallback router. It is used when no AI provider is configured,
 * when the provider fails, and as the safe landing spot when model output is
 * rejected. It only ever picks IDs from the knowledge layer.
 */

const FEE_WORDS = [
  "fee",
  "fees",
  "cost",
  "charges",
  "charge",
  "price",
  "kitna",
  "kitni",
  "kitne",
  "qeemat",
  "amount",
  "paisay",
  "paise",
  "rupay",
  "فیس",
  "کتنی",
  "کتنا",
  "کتنے",
  "قیمت",
  "پیسے",
  "روپے",
];
const DOC_WORDS = [
  "document",
  "documents",
  "kaghaz",
  "kaghazat",
  "kagzat",
  "dastawez",
  "required",
  "requirements",
  "checklist",
  "دستاویز",
  "دستاویزات",
  "کاغذات",
];
const COMPLAINT_WORDS = [
  "complaint",
  "complain",
  "shikayat",
  "shikayaat",
  "bribe",
  "rishwat",
  "harass",
  "شکایت",
  "رشوت",
];
const CIVIC_WORDS = [
  "government",
  "sarkari",
  "office",
  "department",
  "certificate",
  "licence",
  "license",
  "renew",
  "apply",
  "sarkar",
  "سرکاری",
  "دفتر",
  "محکمہ",
  "نادرا",
];
const ROMAN_HINTS = [
  "kaise",
  "kya",
  "mera",
  "meri",
  "mujhe",
  "karun",
  "karna",
  "hai",
  "hain",
  "ke",
  "ka",
  "ki",
  "kitna",
  "chahiye",
  "nahi",
  "kar",
  "gaari",
  "bhai",
  "mein",
  "ko",
];

function norm(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s&'-]/gu, " ")
    .replace(/\s+/g, " ")} `;
}

function hasToken(haystack: string, token: string): boolean {
  const t = token.toLowerCase();
  if ([...t].some((ch) => ch.charCodeAt(0) > 127)) return haystack.includes(t); // Urdu script: substring
  return haystack.includes(` ${t.trim()} `) || (t.length > 4 && haystack.includes(t));
}

export function detectLanguage(text: string): Lang {
  if (/[\u0600-\u06FF]/.test(text)) return "ur";
  const words = norm(text).trim().split(" ");
  const hits = words.filter((w) => ROMAN_HINTS.includes(w)).length;
  return hits >= 2 ? "roman" : "en";
}

export function detectService(text: string): ServiceRecord | null {
  const hay = norm(text);
  let best: { service: ServiceRecord; score: number } | null = null;
  let tie = false;
  for (const service of listServices()) {
    const score = service.keywords.filter((k) => hasToken(hay, k)).length;
    if (score === 0) continue;
    if (!best || score > best.score) {
      best = { service, score };
      tie = false;
    } else if (score === best.score) tie = true;
  }
  return best && !tie ? best.service : null;
}

/** Returns a jurisdiction only when exactly one is mentioned; conflicting mentions return null. */
export function detectJurisdiction(text: string): JurisdictionId | null {
  const hay = norm(text);
  const found = JURISDICTIONS.filter(
    (j) => j.id !== "federal" && j.keywords.some((k) => hasToken(hay, k)),
  ).map((j) => j.id);
  return found.length === 1 ? (found[0] ?? null) : null;
}

function ccBand(type: string, n: number): string {
  if (type === "bike") return n <= 200 ? "200" : n <= 400 ? "400" : "above";
  return n <= 1000 ? "1000" : n <= 1800 ? "1800" : "above";
}

export function detectAnswers(text: string, service: ServiceRecord): Answers {
  const hay = norm(text);
  const out: Answers = {};
  for (const clarifier of service.clarifiers) {
    if (clarifier.key === "jurisdiction") continue;
    const matches = clarifier.options.filter((o) =>
      (o.keywords ?? []).some((k) => hasToken(hay, k)),
    );
    if (matches.length === 1 && matches[0]) out[clarifier.key] = matches[0].value;
  }
  if (service.id === "vehicle-transfer") {
    // Hybrid/electric wording beats a generic "car".
    if (out["vehicleType"] === undefined && /\b(ev|electric)\b/.test(hay))
      out["vehicleType"] = "ev";
    const cc = /(\d{3,4})\s*cc/.exec(hay);
    const type = out["vehicleType"] ?? (cc ? "car" : undefined);
    if (cc && type && type !== "ev") {
      out["vehicleType"] = type;
      out["vehicleBand"] = ccBand(type, Number(cc[1]));
    }
    const kw = /(\d{2,3})\s*kw/.exec(hay);
    if (kw) {
      out["vehicleType"] = "ev";
      const n = Number(kw[1]);
      out["vehicleBand"] = n <= 50 ? "50" : n <= 100 ? "100" : "above";
    }
  }
  if (service.id === "passport") {
    const pages = /\b(36|72|100)\s*(pages|page|safha|صفحات)/.exec(hay);
    if (pages?.[1]) out["pages"] = pages[1];
    const years = /\b(5|10)\s*(years|year|saal|sal|سال)/.exec(hay);
    if (years?.[1]) out["validity"] = years[1];
  }
  return out;
}

export function heuristicRoute(
  text: string,
  context: { serviceId?: string | null; answers?: Answers } = {},
): RouterOutput {
  const language = detectLanguage(text);
  const hay = norm(text);
  const wantsFee = FEE_WORDS.some((w) => hasToken(hay, w));
  const wantsDocs = DOC_WORDS.some((w) => hasToken(hay, w));
  const complaint = COMPLAINT_WORDS.some((w) => hasToken(hay, w));

  const mentioned = detectService(text);
  const service = mentioned ?? (context.serviceId ? (getService(context.serviceId) ?? null) : null);

  if (!service) {
    const topic = complaint
      ? "complaint"
      : wantsFee
        ? "fee"
        : wantsDocs
          ? "documents"
          : CIVIC_WORDS.some((w) => hasToken(hay, w))
            ? "journey"
            : "off_topic";
    return { language, topic, service_id: null, jurisdiction_id: null, answers: {} };
  }

  const detected = detectAnswers(text, service);
  const jurisdiction = service.jurisdictionSensitive ? detectJurisdiction(text) : null;
  const answers =
    mentioned && context.serviceId !== mentioned.id
      ? detected
      : { ...(context.answers ?? {}), ...detected };

  return {
    language,
    topic: complaint ? "complaint" : wantsFee ? "fee" : wantsDocs ? "documents" : "journey",
    service_id: service.id,
    jurisdiction_id: jurisdiction,
    answers,
  };
}
