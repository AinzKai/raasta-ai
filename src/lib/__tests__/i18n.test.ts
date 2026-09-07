import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("i18n translations", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    const mockDocument = { documentElement: { lang: "en", dir: "ltr" } };
    const mockLocalStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    };
    vi.stubGlobal("window", { localStorage: mockLocalStorage });
    vi.stubGlobal("document", mockDocument);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("t() returns English string for known key", async () => {
    const { t } = await import("../i18n");
    expect(t("heroTitle", "en")).toContain("path");
  });

  it("t() returns Urdu string for known key", async () => {
    const { t } = await import("../i18n");
    expect(t("heroTitle", "ur")).toBeTruthy();
  });

  it("t() returns the key itself for unknown keys", async () => {
    const { t } = await import("../i18n");
    expect(t("nonexistent_key", "en")).toBe("nonexistent_key");
  });

  it("setLang persists to localStorage", async () => {
    const { setLang } = await import("../i18n");
    setLang("ur");
    expect(window.localStorage.getItem("raasta.lang")).toBe("ur");
  });

  it("setLang updates document lang and dir", async () => {
    const { setLang } = await import("../i18n");
    setLang("ur");
    expect(document.documentElement.lang).toBe("ur");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("t() returns translations for account page keys", async () => {
    const { t } = await import("../i18n");
    expect(t("myRequests", "en")).toBe("My requests");
    expect(t("myRequests", "ur")).toBeTruthy();
    expect(t("noRequests", "en")).toBe("No saved requests yet.");
    expect(t("noRequests", "ur")).toBeTruthy();
  });

  it("t() returns translations for status page keys", async () => {
    const { t } = await import("../i18n");
    expect(t("systemStatus", "en")).toBe("System status");
    expect(t("systemStatus", "ur")).toBeTruthy();
    expect(t("database", "en")).toBe("Database");
    expect(t("aiProvider", "en")).toBe("AI provider");
  });
});
