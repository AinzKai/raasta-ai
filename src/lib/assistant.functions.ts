import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SERVICES, type Service } from "@/lib/knowledge";
import { callAI, type AiMessage } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Grounded answer generation.
 *
 * The model may ONLY use facts from the knowledge pack we inject. Anything it
 * cannot ground becomes an unverified line with a verification path, never a
 * plausible-looking number.
 */

const Input = z.object({
  question: z.string().min(2).max(2000),
  serviceSlug: z.string().max(64).nullable(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(12)
    .default([]),
});

export type Roadmap = {
  language: "en" | "ur" | "roman";
  service_slug: string | null;
  title: string;
  intro: string;
  clarifying_question: string | null;
  documents: string[];
  steps: { title: string; detail: string }[];
  fees: { label: string; amount_pkr: number | null; unverified: boolean; note: string | null }[];
  warnings: string[];
  sources: { title: string; url: string }[];
  followups: string[];
  off_topic: boolean;
};

function knowledgePack(focus: Service | undefined) {
  const list = focus ? [focus] : SERVICES;
  return JSON.stringify(
    list.map((s) => ({
      slug: s.slug,
      name: s.name,
      agency: s.agencyFull,
      jurisdiction: s.jurisdiction,
      timeline: s.timeline,
      documents: s.documents,
      steps: s.steps,
      fees: s.fees,
      sources: s.sources.map((src) => ({ title: src.title, url: src.url, verified: src.verified })),
      confidence_note: s.confidenceNote ?? null,
      helpline: s.helpline ?? null,
    })),
  );
}

const SYSTEM = `You are Raasta AI, a calm, plain-spoken guide to Pakistani government services.

GROUNDING RULES — these override everything else:
1. Use ONLY the facts in the KNOWLEDGE block. Do not add fees, timelines, office names or requirements from memory.
2. If a fee is marked unverified or is null in KNOWLEDGE, output it with "amount_pkr": null and "unverified": true, and put the verification path (helpline / counter) in "note". NEVER guess a number.
3. Every source you cite must appear in KNOWLEDGE. Never invent a URL.
4. If the question is outside Pakistani civic services, set "off_topic": true and explain briefly in "intro" what Raasta can help with.
5. If the request is ambiguous (which city, which situation), still give the best general checklist AND set "clarifying_question".

LANGUAGE: answer in the same language and script the user wrote in — Urdu script, Roman Urdu, or English. Set "language" to "ur", "roman" or "en" accordingly. Keep sentences short and concrete. Avoid legalese.

TONE: direct, respectful, never alarmist. Mention the most commonly missed step where relevant.

Return ONLY JSON matching this shape:
{"language":"en|ur|roman","service_slug":string|null,"title":string,"intro":string,"clarifying_question":string|null,"documents":string[],"steps":[{"title":string,"detail":string}],"fees":[{"label":string,"amount_pkr":number|null,"unverified":boolean,"note":string|null}],"warnings":string[],"sources":[{"title":string,"url":string}],"followups":string[],"off_topic":boolean}`;

export const askRaasta = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<Roadmap> => {
    await enforceRateLimit("chat");

    const focus = SERVICES.find((s) => s.slug === data.serviceSlug);

    const history: AiMessage[] = data.history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      parts: [{ text: m.content }],
    }));

    const result = await callAI({
      systemInstruction: `${SYSTEM}\n\nKNOWLEDGE:\n${knowledgePack(focus)}`,
      messages: [...history, { role: "user", parts: [{ text: data.question }] }],
    });

    if (!result.ok) {
      if (result.status === 429) throw new Error("Too many requests right now — try again in a moment.");
      if (result.status === 403 || result.status === 401)
        throw new Error("The assistant is not configured correctly. Please contact the app owner.");
      console.error("AI provider error", result.status, result.error);
      throw new Error("The assistant could not answer just now.");
    }

    let parsed: Partial<Roadmap>;
    try {
      parsed = JSON.parse(result.text) as Partial<Roadmap>;
    } catch {
      parsed = {};
    }

    return {
      language: parsed.language ?? "en",
      service_slug: parsed.service_slug ?? focus?.slug ?? null,
      title: parsed.title ?? "Your roadmap",
      intro: parsed.intro ?? "",
      clarifying_question: parsed.clarifying_question ?? null,
      documents: parsed.documents ?? [],
      steps: parsed.steps ?? [],
      fees: parsed.fees ?? [],
      warnings: parsed.warnings ?? [],
      sources: parsed.sources ?? [],
      followups: parsed.followups ?? [],
      off_topic: parsed.off_topic ?? false,
    };
  });
