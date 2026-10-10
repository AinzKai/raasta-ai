import { z } from "zod";
import { findUngroundedFacts, redactIdNumbers } from "@/lib/grounding/prose";

/** Output of "Explain this": plain steps that must stay faithful to the pasted text. */
export const ExplainSchema = z.object({
  steps: z.array(z.string().min(1).max(300)).min(1).max(10),
});

export type ExplainResult =
  | { ok: true; steps: string[] }
  | { ok: false; reason: "invalid" | "ungrounded"; details: string[] };

/**
 * Accept a model's simplification only if it introduces no new numbers or
 * links that were absent from the user's text. Anything else is rejected —
 * a plain-language rewrite must not become a way to smuggle in "facts".
 */
export function validateExplanation(raw: unknown, sourceText: string): ExplainResult {
  const parsed = ExplainSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, reason: "invalid", details: parsed.error.issues.map((i) => i.message) };
  const steps = parsed.data.steps.map((s) => redactIdNumbers(s));
  const problems = findUngroundedFacts(steps.join("\n"), sourceText);
  if (problems.length > 0) return { ok: false, reason: "ungrounded", details: problems };
  return { ok: true, steps };
}
