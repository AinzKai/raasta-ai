/**
 * AI provider client — auto-selects the model based on which API key is
 * configured, so this app can run on either Google Gemini or Alibaba Cloud
 * Qwen (DashScope) without any code changes:
 *
 *   - QWEN_API_KEY (or DASHSCOPE_API_KEY) set  -> uses Qwen, via Alibaba's
 *     OpenAI-compatible endpoint (defaults to the Singapore/international
 *     region; override with QWEN_BASE_URL if needed).
 *   - GEMINI_API_KEY set (and no Qwen key)     -> uses Gemini directly.
 *   - Neither set                              -> returns a clear config error.
 *
 * If both are set, Qwen takes priority. Both providers are asked to return
 * a JSON object; parsing/validating that JSON is the caller's job.
 */

export type AiPart = { text: string } | { inlineImage: { mimeType: string; data: string } };
export type AiMessage = { role: "user" | "assistant"; parts: AiPart[] };

type AiResult = { ok: true; text: string } | { ok: false; status: number; error: string };

function activeProvider(): "qwen" | "gemini" | "none" {
  if (process.env["QWEN_API_KEY"] || process.env["DASHSCOPE_API_KEY"]) return "qwen";
  if (process.env["GEMINI_API_KEY"]) return "gemini";
  return "none";
}

export async function callAI(opts: {
  systemInstruction: string;
  messages: AiMessage[];
  timeoutMs?: number;
}): Promise<AiResult> {
  const provider = activeProvider();
  if (provider === "qwen") return callQwen(opts);
  if (provider === "gemini") return callGemini(opts);
  return {
    ok: false,
    status: 500,
    error: "No AI provider is configured. Set either GEMINI_API_KEY or QWEN_API_KEY (see .env.example).",
  };
}

async function callGemini(opts: {
  systemInstruction: string;
  messages: AiMessage[];
  timeoutMs?: number;
}): Promise<AiResult> {
  const apiKey = process.env["GEMINI_API_KEY"]!;
  const model = process.env["GEMINI_MODEL"] || "gemini-1.5-flash";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);

  try {
    const contents = opts.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: m.parts.map((p) =>
        "text" in p ? { text: p.text } : { inlineData: { mimeType: p.inlineImage.mimeType, data: p.inlineImage.data } },
      ),
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: opts.systemInstruction }] },
          contents,
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );

    if (!res.ok) return { ok: false, status: res.status, error: (await res.text()).slice(0, 500) };

    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return { ok: true, text: json.candidates?.[0]?.content?.parts?.[0]?.text ?? "" };
  } catch (e) {
    const message = e instanceof Error && e.name === "AbortError" ? "Gemini request timed out." : String(e);
    return { ok: false, status: 504, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

async function callQwen(opts: {
  systemInstruction: string;
  messages: AiMessage[];
  timeoutMs?: number;
}): Promise<AiResult> {
  const apiKey = (process.env["QWEN_API_KEY"] || process.env["DASHSCOPE_API_KEY"])!;
  const baseUrl = process.env["QWEN_BASE_URL"] || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
  const hasImage = opts.messages.some((m) => m.parts.some((p) => "inlineImage" in p));
  // qwen-plus/qwen-turbo are text-only; vision needs a qwen-vl-* model.
  const model = hasImage
    ? process.env["QWEN_VISION_MODEL"] || "qwen-vl-plus"
    : process.env["QWEN_MODEL"] || "qwen-plus";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);

  try {
    const toOpenAiContent = (parts: AiPart[]) =>
      parts.map((p) =>
        "text" in p
          ? { type: "text", text: p.text }
          : { type: "image_url", image_url: { url: `data:${p.inlineImage.mimeType};base64,${p.inlineImage.data}` } },
      );

    const messages = [
      { role: "system", content: opts.systemInstruction },
      ...opts.messages.map((m) => ({ role: m.role, content: toOpenAiContent(m.parts) })),
    ];

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({ model, messages, response_format: { type: "json_object" } }),
    });

    if (!res.ok) return { ok: false, status: res.status, error: (await res.text()).slice(0, 500) };

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { ok: true, text: json.choices?.[0]?.message?.content ?? "" };
  } catch (e) {
    const message = e instanceof Error && e.name === "AbortError" ? "Qwen request timed out." : String(e);
    return { ok: false, status: 504, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
