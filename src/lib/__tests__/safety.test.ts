import { describe, expect, it } from "vitest";
import { BOUNDARY, MAX_IMAGE_BYTES, parseDataUrl, sanitizeDocCheck } from "../doc-check";
import { validateExplanation } from "../explain";
import {
  FALLBACK_PER_MINUTE,
  LIMITS,
  RateLimitError,
  checkRateLimit,
  type LimiterDeps,
} from "../rate-limit";

describe("document checker boundary (enforced in code, not by the prompt)", () => {
  it("never passes authenticity or acceptance claims through", () => {
    const out = sanitizeDocCheck({
      looks_like: "A genuine CNIC",
      readable: "good",
      observations: ["The card is authentic", "Image is slightly blurry"],
      possible_problems: ["Looks forged", "Bottom edge cropped"],
      next_step: "It will be accepted by NADRA",
    });
    const { boundary: _boundary, ...modelFields } = out; // the fixed disclaimer itself names these words
    expect(JSON.stringify(modelFields)).not.toMatch(/genuine|authentic|forged|accepted/i);
    expect(out.observations).toEqual(["Image is slightly blurry"]);
    expect(out.possible_problems).toEqual(["Bottom edge cropped"]);
    expect(out.boundary).toBe(BOUNDARY);
  });
  it("redacts ID numbers the model should not have transcribed", () => {
    const out = sanitizeDocCheck({
      observations: ["Number 35202-1234567-1 is visible", "3520212345671"],
    });
    expect(JSON.stringify(out)).not.toMatch(/\d{5}[-\s]?\d{7}/);
  });
  it("survives garbage and non-object output", () => {
    for (const bad of [null, "text", 42, { readable: "excellent" }, { observations: "x" }]) {
      const out = sanitizeDocCheck(bad);
      expect(out.boundary).toBe(BOUNDARY);
      expect(["good", "poor", "unreadable"]).toContain(out.readable);
    }
  });
  it("validates type and size before anything is sent", () => {
    expect("error" in parseDataUrl("data:image/svg+xml;base64,AAAA")).toBe(true);
    expect("error" in parseDataUrl("data:application/pdf;base64,AAAA")).toBe(true);
    expect("error" in parseDataUrl("https://example.com/x.png")).toBe(true);
    expect(
      "error" in
        parseDataUrl(
          `data:image/jpeg;base64,${"A".repeat(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 8)}`,
        ),
    ).toBe(true);
    expect(parseDataUrl("data:image/jpeg;base64,/9j/4AAQ")).toMatchObject({
      mimeType: "image/jpeg",
    });
  });
});

describe("Explain this stays inside the user's text", () => {
  const source = "Applicants must submit the form with a fee of Rs. 1,150 within 12 days.";
  it("accepts a faithful rewrite", () => {
    expect(
      validateExplanation(
        { steps: ["Fill the form.", "Pay 1150 rupees.", "Do it within 12 days."] },
        source,
      ).ok,
    ).toBe(true);
  });
  it("rejects an invented fee, deadline or link", () => {
    expect(validateExplanation({ steps: ["Pay 2,000 rupees."] }, source)).toMatchObject({
      ok: false,
      reason: "ungrounded",
    });
    expect(
      validateExplanation({ steps: ["Apply at https://scam.example.com"] }, source),
    ).toMatchObject({ ok: false, reason: "ungrounded" });
  });
  it("rejects malformed output", () => {
    expect(validateExplanation({ steps: [] }, source)).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(validateExplanation("text", source)).toMatchObject({ ok: false, reason: "invalid" });
  });
});

function deps(overrides: Partial<LimiterDeps> = {}) {
  const counts = new Map<string, number>();
  const d: LimiterDeps = {
    increment: async (k) => {
      counts.set(k, (counts.get(k) ?? 0) + 1);
      return counts.get(k)!;
    },
    now: () => Date.UTC(2026, 9, 9, 12, 0, 30),
    fallback: new Map(),
    ...overrides,
  };
  return { d, counts };
}

describe("layered, fail-closed rate limiting", () => {
  it("allows up to the anonymous per-minute cap, then blocks", async () => {
    const { d } = deps();
    const cap = LIMITS.chat.anonymous.perMinute;
    for (let i = 0; i < cap; i++) await checkRateLimit("chat", { ip: "1.1.1.1", userId: null }, d);
    await expect(checkRateLimit("chat", { ip: "1.1.1.1", userId: null }, d)).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });
  it("signed-in users get a higher cap than anonymous callers", () => {
    expect(LIMITS.chat.user.perMinute).toBeGreaterThan(LIMITS.chat.anonymous.perMinute);
    expect(LIMITS.document.anonymous.perMinute).toBeLessThan(LIMITS.chat.anonymous.perMinute);
  });
  it("enforces the daily cap even when per-minute windows roll over", async () => {
    let t = Date.UTC(2026, 9, 9, 0, 0, 0);
    const { d } = deps({ now: () => t });
    const cap = LIMITS.document.anonymous.perDay;
    for (let i = 0; i < cap; i++) {
      t += 61_000;
      await checkRateLimit("document", { ip: "2.2.2.2", userId: null }, d);
    }
    t += 61_000;
    await expect(
      checkRateLimit("document", { ip: "2.2.2.2", userId: null }, d),
    ).rejects.toMatchObject({ scope: "day" });
  });
  it("limits per user independently of IP", async () => {
    const { d } = deps();
    const cap = LIMITS.chat.user.perMinute;
    for (let i = 0; i < cap; i++)
      await checkRateLimit("chat", { ip: `9.9.9.${i}`, userId: "u1" }, d);
    await expect(
      checkRateLimit("chat", { ip: "9.9.9.200", userId: "u1" }, d),
    ).rejects.toBeInstanceOf(RateLimitError);
  });
  it("an unidentifiable caller shares one strict bucket", async () => {
    const { d, counts } = deps();
    await checkRateLimit("chat", { ip: null, userId: null }, d);
    expect([...counts.keys()].some((k) => k.includes(":unknown:"))).toBe(true);
  });
  it("FAILS CLOSED when the counter is down: a strict in-memory budget, never unlimited", async () => {
    const { d } = deps({
      increment: async () => {
        throw new Error("db down");
      },
    });
    const budget = FALLBACK_PER_MINUTE.chat;
    for (let i = 0; i < budget; i++)
      await checkRateLimit("chat", { ip: "3.3.3.3", userId: null }, d);
    await expect(checkRateLimit("chat", { ip: "3.3.3.3", userId: null }, d)).rejects.toMatchObject({
      scope: "unavailable",
    });
  });
});
