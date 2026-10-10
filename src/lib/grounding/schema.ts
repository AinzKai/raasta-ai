import { z } from "zod";
import type { JurisdictionId, Lang } from "../knowledge";
import type { JourneyInput } from "../journey";

/**
 * What the model is allowed to say: IDs and enums only. There is deliberately
 * no free-text field, no fee field and no URL field — so there is nothing
 * factual for it to invent. `.strict()` rejects any extra key it tries to add.
 */
export const RouterOutputSchema = z
  .object({
    language: z.enum(["en", "ur", "roman"]),
    topic: z.enum(["journey", "fee", "documents", "complaint", "off_topic"]),
    service_id: z.string().max(80).nullable(),
    jurisdiction_id: z.string().max(40).nullable(),
    answers: z.record(z.string().max(40), z.string().max(60)).default({}),
  })
  .strict();

export type RouterOutput = z.infer<typeof RouterOutputSchema>;

export type Focus = "journey" | "fees" | "documents";

export type GroundedAnswer =
  | { kind: "journey"; language: Lang; input: JourneyInput; focus: Focus; dropped: string[] }
  | {
      kind: "clarify";
      language: Lang;
      serviceId: string;
      clarifierKey: string;
      jurisdictionId: JurisdictionId | null;
      answers: Record<string, string>;
    }
  | {
      kind: "unsupported";
      language: Lang;
      serviceId: string;
      requestedJurisdiction: string;
      supported: JurisdictionId[];
      sourceIds: string[];
    }
  | {
      kind: "not_verified";
      language: Lang;
      topic: "fee" | "documents" | "other";
      serviceId: string | null;
      jurisdictionId: JurisdictionId | null;
      sourceIds: string[];
    }
  | { kind: "choose_service"; language: Lang }
  | { kind: "complaint"; language: Lang }
  | { kind: "off_topic"; language: Lang };

export type AssistantResponse = {
  answer: GroundedAnswer;
  meta: {
    engine: "model" | "fallback";
    /** Reasons model output (or parts of it) was rejected. Never shown as facts. */
    rejected: string[];
  };
};
