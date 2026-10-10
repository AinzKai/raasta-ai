import { z } from "zod";
import { claimsAuthenticity, redactIdNumbers } from "@/lib/grounding/prose";

/**
 * Document-checker boundary. The checker is a visual sanity check only. These
 * rules are enforced in code on whatever the model returns, so the boundary
 * does not depend on the prompt being obeyed.
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type DocCheck = {
  looks_like: string;
  readable: "good" | "poor" | "unreadable";
  observations: string[];
  possible_problems: string[];
  next_step: string;
  /** Raasta's own statement of what this check is not. Always present. */
  boundary: string;
};

export const BOUNDARY =
  "This is a visual check only. Raasta cannot confirm that a document is authentic, valid, or will be accepted.";

const SAFE_NEXT =
  "Retake the photo in good light with all four corners visible, then check it against the official checklist.";

const RawSchema = z
  .object({
    looks_like: z.string().optional(),
    readable: z.enum(["good", "poor", "unreadable"]).optional(),
    observations: z.array(z.string()).optional(),
    possible_problems: z.array(z.string()).optional(),
    next_step: z.string().optional(),
  })
  .passthrough();

function clean(text: string): string {
  return redactIdNumbers(text).replace(/\s+/g, " ").trim().slice(0, 200);
}

function cleanList(list: string[] | undefined, max: number): string[] {
  return (list ?? [])
    .map(clean)
    .filter((s) => s.length > 0 && !claimsAuthenticity(s))
    .slice(0, max);
}

export function parseDataUrl(
  dataUrl: string,
): { mimeType: string; data: string } | { error: string } {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { error: "That does not look like an image." };
  const [, mimeType, data] = m as unknown as [string, string, string];
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return { error: "Please use a JPEG, PNG or WebP photo." };
  }
  const bytes = Math.floor((data.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) return { error: "That image is too large. Try a smaller photo." };
  return { mimeType, data };
}

/** Turn arbitrary model JSON into a safe DocCheck. Never throws. */
export function sanitizeDocCheck(raw: unknown): DocCheck {
  const parsed = RawSchema.safeParse(raw);
  const value = parsed.success ? parsed.data : {};

  const looks = value.looks_like ? clean(value.looks_like) : "";
  const next = value.next_step ? clean(value.next_step) : "";

  return {
    looks_like: looks && !claimsAuthenticity(looks) ? looks : "A document photo",
    readable: value.readable ?? "poor",
    observations: cleanList(value.observations, 6),
    possible_problems: cleanList(value.possible_problems, 6),
    next_step: next && !claimsAuthenticity(next) ? next : SAFE_NEXT,
    boundary: BOUNDARY,
  };
}
