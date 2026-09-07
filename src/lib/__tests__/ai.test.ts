import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("AI provider auto-selection", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns error when no provider is configured", async () => {
    delete process.env["QWEN_API_KEY"];
    delete process.env["DASHSCOPE_API_KEY"];
    delete process.env["GEMINI_API_KEY"];

    const { callAI } = await import("../ai");
    const result = await callAI({
      systemInstruction: "test",
      messages: [{ role: "user", parts: [{ text: "hello" }] }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).toContain("No AI provider is configured");
    }
  });

  it("selects Qwen when QWEN_API_KEY is set", async () => {
    process.env["QWEN_API_KEY"] = "test-key";
    process.env["GEMINI_API_KEY"] = "test-key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { callAI } = await import("../ai");
    const result = await callAI({
      systemInstruction: "test",
      messages: [{ role: "user", parts: [{ text: "hello" }] }],
    });

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("dashscope"),
      expect.anything(),
    );
    vi.unstubAllGlobals();
  });

  it("selects Gemini when only GEMINI_API_KEY is set", async () => {
    delete process.env["QWEN_API_KEY"];
    delete process.env["DASHSCOPE_API_KEY"];
    process.env["GEMINI_API_KEY"] = "test-key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { callAI } = await import("../ai");
    const result = await callAI({
      systemInstruction: "test",
      messages: [{ role: "user", parts: [{ text: "hello" }] }],
    });

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com"),
      expect.anything(),
    );
    vi.unstubAllGlobals();
  });

  it("selects Qwen vision model when image is present", async () => {
    process.env["QWEN_API_KEY"] = "test-key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { callAI } = await import("../ai");
    const result = await callAI({
      systemInstruction: "test",
      messages: [
        {
          role: "user",
          parts: [
            { text: "check this" },
            { inlineImage: { mimeType: "image/jpeg", data: "base64data" } },
          ],
        },
      ],
    });

    expect(result.ok).toBe(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("qwen-vl-plus");
    vi.unstubAllGlobals();
  });
});
