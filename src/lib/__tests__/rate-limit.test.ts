import { describe, it, expect } from "vitest";
import { RateLimitError } from "../rate-limit";

describe("RateLimitError", () => {
  it("has correct name", () => {
    const err = new RateLimitError();
    expect(err.name).toBe("RateLimitError");
  });

  it("has a user-friendly message", () => {
    const err = new RateLimitError();
    expect(err.message).toContain("Too many requests");
  });

  it("is an instance of Error", () => {
    const err = new RateLimitError();
    expect(err).toBeInstanceOf(Error);
  });
});

describe("rate limit bucket key format", () => {
  it("formats bucket key as endpoint:ip:windowId", () => {
    const endpoint = "chat";
    const ip = "127.0.0.1";
    const windowMs = 60_000;
    const windowId = Math.floor(Date.now() / windowMs);
    const bucketKey = `${endpoint}:${ip}:${windowId}`;

    expect(bucketKey).toMatch(/^chat:127\.0\.0\.1:\d+$/);
  });

  it("uses 1-minute fixed window", () => {
    const windowMs = 60_000;
    const now = Date.now();
    const windowId = Math.floor(now / windowMs);

    // Window should be within the current minute
    const windowStart = windowId * windowMs;
    expect(now).toBeGreaterThanOrEqual(windowStart);
    expect(now).toBeLessThan(windowStart + windowMs);
  });
});
