import { z } from "zod";
import { EMPTY_STATE, type JourneyInput, type JourneyState } from "./types";

const ID = z.string().min(1).max(160);

export const JourneyInputSchema = z
  .object({
    serviceId: ID,
    jurisdictionId: z.enum(["federal", "ict", "punjab", "sindh", "kp", "balochistan"]),
    answers: z
      .record(z.string().max(40), z.string().max(60))
      .refine((a) => Object.keys(a).length <= 12, "Too many answers"),
  })
  .strict();

export const JourneyStateSchema = z
  .object({
    checklist: z.record(ID, z.enum(["ready", "attention", "unavailable"])),
    applies: z.record(ID, z.boolean()),
    stepOverrides: z.record(ID, z.enum(["completed", "skipped"])),
    notes: z.record(ID, z.string().max(2000)),
  })
  .strict();

/** Never trust stored state: unknown shapes become a clean slate, not a crash. */
export function parseState(value: unknown): JourneyState {
  const parsed = JourneyStateSchema.safeParse(value);
  return parsed.success
    ? parsed.data
    : { ...EMPTY_STATE, checklist: {}, applies: {}, stepOverrides: {}, notes: {} };
}

export function parseInput(value: unknown): JourneyInput | null {
  const parsed = JourneyInputSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
