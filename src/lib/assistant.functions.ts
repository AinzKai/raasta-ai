import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { routeQuestion, type AssistantResponse } from "@/lib/grounding";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Grounded routing.
 *
 * The model (when configured) only classifies the request into IDs. The
 * server validates every ID against the verified knowledge layer, and the
 * client renders facts straight from that layer. There is no code path by
 * which a model-written fee, URL or procedure reaches the user.
 */

const Input = z.object({
  question: z.string().trim().min(2).max(1500),
  context: z
    .object({
      serviceId: z.string().max(80).nullable(),
      answers: z.record(z.string().max(40), z.string().max(60)).default({}),
    })
    .default({ serviceId: null, answers: {} }),
});

export type { AssistantResponse };

export const askRaasta = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<AssistantResponse> => {
    await enforceRateLimit("chat");
    return routeQuestion(data.question, data.context);
  });
