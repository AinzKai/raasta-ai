import { describe, expect, it } from "vitest";
import {
  FEES,
  SOURCES,
  collectSources,
  effectiveStatus,
  getFeesForService,
  getService,
  listServices,
  nextClarifier,
  preferSource,
  resolveActionId,
  resolveFeeId,
  resolveSourceId,
  selectFees,
  validateKnowledge,
  getSource,
  isTrusted,
  PRIMARY_SLUGS,
} from "../knowledge";

const feeAmount = (id: string) => FEES.find((f) => f.id === id)?.amount;

describe("knowledge integrity", () => {
  it("has no structural problems", () => {
    expect(validateKnowledge()).toEqual([]);
  });

  it("every service has a unique slug and the primary slugs exist", () => {
    const slugs = listServices().map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of PRIMARY_SLUGS) expect(slugs).toContain(s);
  });

  it("no record claims to be trusted without a source, or without an amount", () => {
    for (const f of FEES) {
      if (isTrusted(f.verificationStatus)) {
        expect(f.sourceId, f.id).toBeTruthy();
        expect(f.amount, f.id).not.toBeNull();
      }
    }
  });

  it("fees are structured numbers with a currency, never strings", () => {
    for (const f of FEES) {
      expect(typeof f.amount === "number" || f.amount === null, f.id).toBe(true);
      expect(f.currency).toBe("PKR");
    }
  });

  it("no source carries a human verification date set by automation", () => {
    for (const s of SOURCES) expect(s.lastVerifiedAt, s.id).toBeNull();
  });
});

describe("seed data supplied for Raasta", () => {
  it("CNIC renewal fees", () => {
    expect(feeAmount("cnic.federal.fee.renewal-normal")).toBe(400);
    expect(feeAmount("cnic.federal.fee.renewal-urgent")).toBe(1150);
    expect(feeAmount("cnic.federal.fee.renewal-executive")).toBe(2150);
    expect(feeAmount("cnic.federal.fee.smart-renewal-normal")).toBe(750);
  });

  it("passport MRP fees and processing targets", () => {
    expect(feeAmount("passport.federal.fee.36p-5y-normal")).toBe(4500);
    expect(feeAmount("passport.federal.fee.100p-10y-fasttrack")).toBe(32000);
    const fast = FEES.find((f) => f.id === "passport.federal.fee.36p-5y-fasttrack")!;
    expect([fast.processingDays, fast.processingUnit]).toEqual([2, "working_days"]);
  });

  it("Islamabad vehicle transfer uses the April 2025 notification amounts", () => {
    expect(feeAmount("vehicle-transfer.ict.fee.car-1000")).toBe(2750);
    expect(feeAmount("vehicle-transfer.ict.fee.car-1800")).toBe(5500);
    expect(feeAmount("vehicle-transfer.ict.fee.car-above")).toBe(11000);
    expect(feeAmount("vehicle-transfer.ict.fee.ev-100")).toBe(5500);
  });

  it("Islamabad vehicle information is never sourced from Punjab Excise", () => {
    for (const f of FEES.filter((x) => x.serviceId === "vehicle-transfer")) {
      expect(getSource(f.sourceId)?.url ?? "", f.id).not.toMatch(/punjab/i);
    }
    expect(getSource("ict-excise.transfer-fee-notification")?.url).toContain(
      "islamabadexcise.gov.pk",
    );
  });

  it("superseded pre-2025 amounts are kept only as history and never shown", () => {
    const shown = getFeesForService("vehicle-transfer", "ict");
    expect(shown.some((f) => f.historical)).toBe(false);
    expect(FEES.filter((f) => f.historical).every((f) => !!f.supersededBy)).toBe(true);
  });

  it("uncertainty is preserved: motorbike fees need confirmation, lost-CNIC fee is not verified", () => {
    expect(FEES.find((f) => f.id === "vehicle-transfer.ict.fee.bike-200")!.verificationStatus).toBe(
      "needs_confirmation",
    );
    const lost = FEES.find((f) => f.id === "cnic.federal.fee.lost")!;
    expect(lost.amount).toBeNull();
    expect(lost.verificationStatus).toBe("not_verified");
  });
});

describe("resolvers reject what the model must not be able to use", () => {
  const scope = { serviceId: "vehicle-transfer", jurisdictionId: "ict" } as const;
  it("accepts a real fee id", () => {
    expect(resolveFeeId("vehicle-transfer.ict.fee.car-1000", scope).ok).toBe(true);
  });
  it("rejects unknown ids", () => {
    expect(resolveFeeId("made-up-fee", scope)).toEqual({ ok: false, reason: "unknown" });
    expect(resolveSourceId("https://evil.example")).toEqual({ ok: false, reason: "unknown" });
  });
  it("rejects a superseded fee", () => {
    expect(resolveFeeId("vehicle-transfer.ict.fee.legacy-car-1000", scope)).toEqual({
      ok: false,
      reason: "superseded",
    });
  });
  it("never mixes services or jurisdictions", () => {
    expect(resolveFeeId("cnic.federal.fee.renewal-normal", scope)).toEqual({
      ok: false,
      reason: "service_mismatch",
    });
    expect(
      resolveFeeId("vehicle-transfer.ict.fee.car-1000", {
        serviceId: "vehicle-transfer",
        jurisdictionId: "punjab",
      }),
    ).toEqual({ ok: false, reason: "jurisdiction_mismatch" });
    expect(
      resolveActionId("vehicle-transfer.ict.action.excise-site", {
        serviceId: "vehicle-transfer",
        jurisdictionId: "ict",
      }).ok,
    ).toBe(true);
  });
});

describe("fee selection", () => {
  it("shows primary fees until the user narrows, then only matching ones", () => {
    const base = selectFees("vehicle-transfer", "ict", {});
    expect(base.shown.some((f) => f.id.endsWith("car-1000"))).toBe(true);
    expect(base.shown.some((f) => f.id.includes("bike"))).toBe(false);
    const bike = selectFees("vehicle-transfer", "ict", { vehicleType: "bike" });
    expect(bike.shown.filter((f) => f.id.includes("fee.bike")).length).toBe(3);
    const exact = selectFees("vehicle-transfer", "ict", {
      vehicleType: "car",
      vehicleBand: "1800",
    });
    expect(
      exact.shown.filter((f) => f.amount !== null && f.match["vehicleBand"]).map((f) => f.amount),
    ).toEqual([5500]);
  });
  it("a lost CNIC resolves to the not-verified record only", () => {
    const lost = selectFees("cnic", "federal", { situation: "lost" });
    expect(lost.shown.filter((f) => f.match["situation"]).map((f) => f.verificationStatus)).toEqual(
      ["not_verified"],
    );
  });
  it("asks the blocking jurisdiction question first", () => {
    expect(nextClarifier(getService("vehicle-transfer")!, {})?.key).toBe("jurisdiction");
    expect(nextClarifier(getService("vehicle-transfer")!, { jurisdiction: "ict" })?.key).toBe(
      "vehicleType",
    );
  });
});

describe("source priority and staleness", () => {
  it("a notification outranks a service page, which outranks an FAQ", () => {
    const n = getSource("ict-excise.transfer-fee-notification")!;
    const page = getSource("ict-admin.vehicle-transfer")!;
    const faq = getSource("dgip.faq")!;
    expect(preferSource(page, n)).toBe(n);
    expect(preferSource(faq, page)).toBe(page);
  });
  it("collectSources orders most authoritative first", () => {
    const ids = collectSources([
      { sourceId: "dgip.faq" },
      { sourceId: "ict-excise.transfer-fee-notification" },
    ]).map((s) => s.id);
    expect(ids[0]).toBe("ict-excise.transfer-fee-notification");
  });
  it("an old, never-refreshed read stops looking trusted", () => {
    const rec = {
      sourceId: "nadra.site",
      verificationStatus: "official_source" as const,
      lastCheckedAt: "2026-01-01",
      lastVerifiedAt: null,
      basis: "",
    };
    expect(effectiveStatus(rec, new Date("2026-10-09"))).toBe("needs_confirmation");
    expect(effectiveStatus(rec)).toBe("official_source");
  });
  it("an unknown date is not invented into staleness", () => {
    const rec = {
      sourceId: "ict-excise.site",
      verificationStatus: "official_source" as const,
      lastCheckedAt: null,
      lastVerifiedAt: null,
      basis: "",
    };
    expect(effectiveStatus(rec, new Date("2030-01-01"))).toBe("official_source");
  });
  it("service lookup", () => {
    expect(getService("passport")?.agencyId).toBe("dgip");
    expect(getService(null)).toBeUndefined();
  });
});
