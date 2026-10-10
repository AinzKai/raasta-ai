/**
 * Pure helpers for source monitoring. Automated monitoring is NOT human
 * verification: a changed page only ever raises `review_required` and may
 * create a review candidate. It never edits trusted knowledge.
 */

const VOLATILE = [
  /\b(?:page\s+)?last\s+(?:updated|modified|reviewed)\b[^.\n]{0,40}/gi,
  /\bupdated\s+on\b[^.\n]{0,30}/gi,
  /\b(?:total\s+)?(?:visitors?|visits?|hits|page\s*views?|counter)\b[^.\n]{0,25}\d[\d,]*/gi,
  /©\s*\d{4}/g,
  /\bcopyright\s*(?:©)?\s*\d{4}/gi,
];

const BLOCK_ELEMENTS =
  /<(nav|header|footer|aside|noscript|svg|iframe|form|script|style|template)\b[\s\S]*?<\/\1\s*>/gi;

/**
 * Reduce HTML to the text a person would read as content, dropping chrome that
 * changes without any factual meaning (navigation, footers, scripts, counters).
 */
export function normalizeContent(html: string): string {
  let text = html.replace(/<!--[\s\S]*?-->/g, " ").replace(BLOCK_ELEMENTS, " ");
  text = text
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#?\w+;/g, " ");
  for (const re of VOLATILE) text = text.replace(re, " ");
  return text
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .toLowerCase()
    .slice(0, 80_000);
}

/** Back-compat name used by the original source-health engine. */
export const normalizeForHash = normalizeContent;

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const BLOCK_SIGNS =
  /(access denied|captcha|are you a robot|just a moment|enable javascript|request blocked|forbidden|cloudflare ray id)/i;

/** A bot-protection or error page. We never try to get around these; the source becomes manual. */
export function looksBlocked(normalized: string): boolean {
  return normalized.length < 250 || BLOCK_SIGNS.test(normalized.slice(0, 1500));
}

/** Numbers that carry facts (fees, days, dates). Single digits are ignored as noise. */
export function factTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const t = m[0].replace(/,/g, "");
    if (t.length >= 2) out.add(t);
  }
  return out;
}

function shingles(text: string): Set<string> {
  const words = text.split(/\s+/).filter(Boolean).slice(0, 4000);
  const out = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) out.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  return out;
}

export type ChangeAssessment = {
  contentChanged: boolean;
  /** Facts (numbers/dates) changed, or a large share of the wording changed. */
  meaningful: boolean;
  addedFacts: string[];
  removedFacts: string[];
  similarity: number;
  reviewRequired: boolean;
};

export function assessChange(args: {
  reachable: boolean;
  previousHash: string | null;
  currentHash: string | null;
  previousText?: string | null;
  currentText?: string | null;
}): ChangeAssessment {
  const { reachable, previousHash, currentHash, previousText, currentText } = args;
  const contentChanged = !!previousHash && !!currentHash && previousHash !== currentHash;

  let addedFacts: string[] = [];
  let removedFacts: string[] = [];
  let similarity = 1;
  if (contentChanged && previousText && currentText) {
    const a = factTokens(previousText);
    const b = factTokens(currentText);
    addedFacts = [...b].filter((x) => !a.has(x)).sort();
    removedFacts = [...a].filter((x) => !b.has(x)).sort();
    const sa = shingles(previousText);
    const sb = shingles(currentText);
    const inter = [...sa].filter((x) => sb.has(x)).length;
    const union = sa.size + sb.size - inter;
    similarity = union === 0 ? 1 : inter / union;
  }
  // Without the previous text we cannot tell noise from facts, so a hash change is treated as meaningful.
  const meaningful =
    contentChanged &&
    (!previousText || addedFacts.length + removedFacts.length > 0 || similarity < 0.85);
  return {
    contentChanged,
    meaningful,
    addedFacts,
    removedFacts,
    similarity,
    reviewRequired: meaningful || !reachable,
  };
}
