/**
 * Deterministic guards for free-text model output (Explain This, document
 * checks). A model may rephrase text the user supplied, but it may not add
 * numbers, links or phone numbers that were not in that text.
 */

const URDU_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = URDU_DIGITS.indexOf(d);
    return String(i >= 0 ? i : PERSIAN_DIGITS.indexOf(d));
  });
}

function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of normalizeDigits(text).matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    out.add(m[0].replace(/,/g, ""));
  }
  return out;
}

function urlsIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(
    /\b(?:https?:\/\/|www\.)[^\s)]+|\b[a-z0-9-]+\.(?:gov\.pk|com\.pk|org\.pk|pk|com|org|net)\b[^\s)]*/gi,
  )) {
    out.add(m[0].toLowerCase().replace(/[.,;]+$/, ""));
  }
  return out;
}

/** Numbers, URLs or phone-like digit runs in `output` that do not occur in `source`. */
export function findUngroundedFacts(output: string, source: string): string[] {
  const allowedNumbers = numbersIn(source);
  const allowedUrls = urlsIn(source);
  const problems: string[] = [];

  for (const n of numbersIn(output)) {
    if (!allowedNumbers.has(n)) problems.push(`number ${n}`);
  }
  for (const u of urlsIn(output)) {
    if (![...allowedUrls].some((a) => a === u || a.includes(u) || u.includes(a)))
      problems.push(`link ${u}`);
  }
  return problems;
}

/** Mask 13-digit CNIC-like numbers (with or without dashes/spaces). */
export function redactIdNumbers(text: string): string {
  return normalizeDigits(text).replace(/\b\d{5}[-\s]?\d{7}[-\s]?\d\b/g, "•••••-•••••••-•");
}

const AUTHENTICITY =
  /\b(authentic|genuine|forged|forgery|fake|counterfeit|legitimate|legally valid|is valid|are valid|verified by|government[- ]verified|officially (?:valid|verified|accepted)|will be accepted|guaranteed)\b/i;

/** Document-check output must never claim authenticity or acceptance. */
export function claimsAuthenticity(text: string): boolean {
  return AUTHENTICITY.test(text);
}
