import { afterEach, describe, expect, it, vi } from "vitest";
import { isSupabaseConfigured } from "../../integrations/supabase/config";

const KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
];

afterEach(() => vi.unstubAllEnvs());

describe("isSupabaseConfigured (public demo must not need Supabase)", () => {
  it("is false when neither the URL nor the key is present", () => {
    for (const k of KEYS) vi.stubEnv(k, "");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("is false when only one of the two is present", () => {
    for (const k of KEYS) vi.stubEnv(k, "");
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.invalid");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("is true when both are present (build-time or runtime variables)", () => {
    for (const k of KEYS) vi.stubEnv(k, "");
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.invalid");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "placeholder");
    expect(isSupabaseConfigured()).toBe(true);
    for (const k of KEYS) vi.stubEnv(k, "");
    vi.stubEnv("SUPABASE_URL", "https://example.invalid");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "placeholder");
    expect(isSupabaseConfigured()).toBe(true);
  });
});
