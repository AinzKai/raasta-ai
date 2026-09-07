import { describe, it, expect } from "vitest";
import { SERVICES, getService, PRIMARY_SLUGS, AGENCIES, DEPARTMENTS, COMPLAINT_CATEGORIES } from "../knowledge";

describe("SERVICES knowledge base integrity", () => {
  it("has at least 5 services", () => {
    expect(SERVICES.length).toBeGreaterThanOrEqual(5);
  });

  it("every service has a unique slug", () => {
    const slugs = SERVICES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every service has non-empty scenarios", () => {
    for (const s of SERVICES) {
      expect(s.scenarios.length).toBeGreaterThan(0);
    }
  });

  it("every service has non-empty documents", () => {
    for (const s of SERVICES) {
      expect(s.documents.length).toBeGreaterThan(0);
    }
  });

  it("every service has non-empty steps", () => {
    for (const s of SERVICES) {
      expect(s.steps.length).toBeGreaterThan(0);
    }
  });

  it("every service has at least one fee", () => {
    for (const s of SERVICES) {
      expect(s.fees.length).toBeGreaterThan(0);
    }
  });

  it("every service has at least one source", () => {
    for (const s of SERVICES) {
      expect(s.sources.length).toBeGreaterThan(0);
    }
  });

  it("every fee is either unverified or has a verified amount", () => {
    for (const s of SERVICES) {
      for (const fee of s.fees) {
        if (fee.unverified) {
          expect(fee.amountPkr).toBeNull();
        } else {
          expect(fee.amountPkr).not.toBeNull();
          expect(typeof fee.amountPkr).toBe("number");
        }
      }
    }
  });

  it("no service has undefined required metadata", () => {
    for (const s of SERVICES) {
      expect(s.name).toBeDefined();
      expect(s.urduName).toBeDefined();
      expect(s.agency).toBeDefined();
      expect(s.summary).toBeDefined();
      expect(s.jurisdiction).toBeDefined();
      expect(s.online).toBeDefined();
      expect(s.timeline).toBeDefined();
    }
  });
});

describe("getService helper", () => {
  it("returns the correct service for a valid slug", () => {
    const s = getService("cnic");
    expect(s).toBeDefined();
    expect(s!.slug).toBe("cnic");
  });

  it("returns undefined for null", () => {
    expect(getService(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(getService(undefined)).toBeUndefined();
  });

  it("returns undefined for unknown slug", () => {
    expect(getService("nonexistent")).toBeUndefined();
  });
});

describe("PRIMARY_SLUGS", () => {
  it("contains only valid slugs", () => {
    const validSlugs = SERVICES.map((s) => s.slug);
    for (const slug of PRIMARY_SLUGS) {
      expect(validSlugs).toContain(slug);
    }
  });
});

describe("AGENCIES", () => {
  it("has no duplicates", () => {
    expect(new Set(AGENCIES).size).toBe(AGENCIES.length);
  });
});

describe("DEPARTMENTS and COMPLAINT_CATEGORIES", () => {
  it("DEPARTMENTS is non-empty", () => {
    expect(DEPARTMENTS.length).toBeGreaterThan(0);
  });

  it("COMPLAINT_CATEGORIES is non-empty", () => {
    expect(COMPLAINT_CATEGORIES.length).toBeGreaterThan(0);
  });
});
