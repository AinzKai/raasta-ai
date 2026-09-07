import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SERVICES } from "@/lib/knowledge";
import { callAI } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Document sanity-check. This is a VISUAL read only — it can tell you a page
 * looks blurry or a field looks blank. It cannot verify authenticity, and the
 * UI must say so wherever a result is shown.
 */

const Input = z.object({
  serviceSlug: z.string().max(64).nullable(),
  imageDataUrl: z
    .string()
    .max(7_500_000)
    .refine((v) => v.startsWith("data:image/"), "Must be an image"),
});

export type DocCheck = {
  looks_like: string;
  readable: "good" | "poor" | "unreadable";
  observations: string[];
  possible_problems: string[];
  next_step: string;
};

export const checkDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<DocCheck> => {
    await enforceRateLimit("document");

    const service = SERVICES.find((s) => s.slug === data.serviceSlug);
    const expected = service
      ? `The citizen is preparing for: ${service.name}. Expected documents: ${service.documents.join("; ")}.`
      : "The citizen has not said which service this is for.";

    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(data.imageDataUrl);
    if (!match) throw new Error("Could not read that image.");
    const [, mimeType, base64Data] = match;

    const systemInstruction = `You perform a VISUAL sanity check on a photo of a Pakistani document. You are NOT verifying authenticity and must never claim a document is genuine, valid or accepted. Only describe what is visible: legibility, glare, cropping, blank fields, visible expiry dates. ${expected}
Return ONLY JSON: {"looks_like":string,"readable":"good|poor|unreadable","observations":string[],"possible_problems":string[],"next_step":string}. Keep every string short and plain. Never transcribe full CNIC numbers — mask them.`;

    const result = await callAI({
      systemInstruction,
      messages: [
        {
          role: "user",
          parts: [
            { text: "Check this document photo before I go to the office." },
            { inlineImage: { mimeType, data: base64Data } },
          ],
        },
      ],
    });

    if (!result.ok) {
      if (result.status === 429) throw new Error("Too many requests — wait a moment and try again.");
      if (result.status === 403 || result.status === 401) throw new Error("The assistant is not configured correctly.");
      console.error("Doc check failed", result.status, result.error);
      throw new Error("Could not read that image.");
    }

    let parsed: Partial<DocCheck> = {};
    try {
      parsed = JSON.parse(result.text) as Partial<DocCheck>;
    } catch {
      parsed = {};
    }

    return {
      looks_like: parsed.looks_like ?? "Unclear",
      readable: parsed.readable ?? "poor",
      observations: parsed.observations ?? [],
      possible_problems: parsed.possible_problems ?? [],
      next_step: parsed.next_step ?? "Re-take the photo in good light and try again.",
    };
  });
