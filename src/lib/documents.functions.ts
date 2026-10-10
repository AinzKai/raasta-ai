import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getService } from "@/lib/knowledge";
import { callAI } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseDataUrl, sanitizeDocCheck, type DocCheck } from "@/lib/doc-check";

export type { DocCheck };

const Input = z.object({
  serviceSlug: z.string().max(64).nullable(),
  imageDataUrl: z.string().max(7_500_000),
});

/**
 * Visual sanity check. The image is sent to the configured AI provider for
 * this one request and is never written to Raasta's database or storage.
 * (Whether the provider retains it is governed by that provider's terms.)
 */
export const checkDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<DocCheck> => {
    await enforceRateLimit("document");

    const image = parseDataUrl(data.imageDataUrl);
    if ("error" in image) throw new Error(image.error);

    const service = getService(data.serviceSlug);
    const expected = service
      ? `The citizen is preparing for: ${service.name.en}.`
      : "The citizen has not said which service this is for.";

    const result = await callAI({
      systemInstruction: `You perform a VISUAL sanity check on a photo of a Pakistani document. You are NOT verifying authenticity and must never say a document is genuine, valid, real, fake or accepted. Describe only what is visible: legibility, glare, blur, cropping, blank fields, whether a photograph looks clear. ${expected}
Never write ID numbers; if you must refer to one, say "an ID number is visible". Do not transcribe any text.
Return ONLY JSON: {"looks_like":string,"readable":"good|poor|unreadable","observations":string[],"possible_problems":string[],"next_step":string}. Keep every string under 20 words.`,
      messages: [
        {
          role: "user",
          parts: [
            { text: "Check this document photo before I go to the office." },
            { inlineImage: { mimeType: image.mimeType, data: image.data } },
          ],
        },
      ],
    });

    if (!result.ok) {
      if (result.status === 429)
        throw new Error("Too many requests — wait a moment and try again.");
      console.error("Doc check failed", result.status, result.error);
      throw new Error("Could not check that image. Please try again.");
    }

    let raw: unknown = {};
    try {
      raw = JSON.parse(result.text);
    } catch {
      raw = {};
    }
    return sanitizeDocCheck(raw);
  });
