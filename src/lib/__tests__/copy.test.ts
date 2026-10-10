import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COPY, tf } from "../copy";
import { t } from "../i18n";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory()
      ? f === "__tests__"
        ? []
        : walk(p)
      : /\.tsx?$/.test(f)
        ? [p]
        : [];
  });
}

describe("localization", () => {
  it("every copy key has non-empty English, Urdu and Roman Urdu", () => {
    for (const [key, v] of Object.entries(COPY)) {
      for (const lang of ["en", "ur", "roman"] as const)
        expect(v[lang].trim().length, `${key}.${lang}`).toBeGreaterThan(0);
    }
  });
  it("Urdu is in Urdu script and Roman Urdu is in Latin script", () => {
    const skip = new Set(["brandTagline"]);
    for (const [key, v] of Object.entries(COPY)) {
      if (skip.has(key)) continue;
      if (!/^\{?\w*\}?$/.test(v.ur))
        expect(/[\u0600-\u06FF]|^[A-Za-z0-9 .:+/-]+$/.test(v.ur), `ur ${key}`).toBe(true);
      expect(/[\u0600-\u06FF]/.test(v.roman), `roman ${key} must not contain Urdu script`).toBe(
        false,
      );
    }
  });
  it("Roman Urdu is not just a copy of English for sentences", () => {
    const same = Object.entries(COPY).filter(
      ([, v]) => v.roman === v.en && v.en.split(" ").length > 4,
    );
    expect(same.map(([k]) => k)).toEqual([]);
  });
  it("placeholders are identical across languages", () => {
    for (const [key, v] of Object.entries(COPY)) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      expect(ph(v.ur), key).toBe(ph(v.en));
      expect(ph(v.roman), key).toBe(ph(v.en));
    }
  });
  it("tf fills placeholders in every language", () => {
    for (const lang of ["en", "ur", "roman"] as const)
      expect(tf("stepOf", lang, { n: 2, total: 5 })).toMatch(/2/);
  });
  it("t() resolves new copy and falls back safely", () => {
    expect(t("navStart", "roman")).toBe(COPY.navStart.roman);
    expect(t("definitely-missing-key", "ur")).toBe("definitely-missing-key");
  });
  it("every literal key used in the UI exists", () => {
    const src = join(__dirname, "..", "..");
    const used = new Set<string>();
    for (const file of walk(src)) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/\b(?:T|tf|copy)\(\s*"(\w+)"/g)) used.add(m[1]!);
      for (const m of text.matchAll(/\bt\(\s*"(\w+)"\s*,\s*lang/g)) used.add(m[1]!); // legacy t("key", lang) is checked by i18n.test
    }
    const legacyOk = (k: string) => t(k, "en") !== k;
    const missing = [...used].filter((k) => !(k in COPY) && !legacyOk(k));
    expect(missing).toEqual([]);
  });
});
