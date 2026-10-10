import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  FEES,
  SOURCES,
  effectiveStatus,
  linkOrigin,
  statusExplanation,
  thirdPartyName,
  type Provenance,
} from "../knowledge";
import { applyOverlayToFees } from "../freshness";
import { buildJourney, emptyJourneyInput, EMPTY_STATE, primaryActionFor } from "../journey";

const NOW = new Date("2026-10-10T00:00:00Z");

const base: Provenance = {
  sourceId: "ict-excise.transfer-fee-notification",
  verificationStatus: "verified",
  lastCheckedAt: null,
  lastVerifiedAt: null,
  basis: "test",
};

describe("Verified means a dated human check — nothing else", () => {
  it("a record that merely claims 'verified' without a human date is shown as official source", () => {
    expect(effectiveStatus(base, NOW)).toBe("official_source");
    expect(effectiveStatus(base)).toBe("official_source");
  });

  it("a dated human check is allowed to display as verified", () => {
    const checked = { ...base, lastVerifiedAt: "2026-10-09", lastCheckedAt: "2026-10-09" };
    expect(effectiveStatus(checked, NOW)).toBe("verified");
  });

  it("is not upgraded: weaker statuses are never raised", () => {
    for (const s of ["needs_confirmation", "not_verified", "user_provided"] as const) {
      expect(effectiveStatus({ ...base, verificationStatus: s }, NOW)).toBe(s);
    }
  });

  it("no seeded record, source or action stores or displays 'verified' (no human dates exist in the seed)", () => {
    for (const r of [...FEES, ...SOURCES, ...ACTIONS]) {
      expect(r.lastVerifiedAt, r.id).toBeNull();
      expect(r.verificationStatus, r.id).not.toBe("verified");
      expect(effectiveStatus(r, NOW), r.id).not.toBe("verified");
    }
  });

  it("the Islamabad transfer fees show as official source, with no invented dates", () => {
    const j = buildJourney(emptyJourneyInput("vehicle-transfer", "ict", {}), EMPTY_STATE);
    const trusted = j.fees.shown.filter((f) => f.amount !== null);
    expect(trusted.length).toBeGreaterThan(0);
    for (const f of trusted) {
      expect(effectiveStatus(f, NOW)).toBe("official_source");
      expect(f.lastVerifiedAt).toBeNull();
      expect(f.lastCheckedAt).toBeNull();
    }
    // Unconfirmed amounts remain unconfirmed.
    expect(
      j.fees.shown
        .filter((f) => f.amount === null)
        .every((f) => effectiveStatus(f, NOW) === "not_verified"),
    ).toBe(true);
  });

  it("an admin-approved version legitimately becomes Verified, with its real approval date", () => {
    const FEE = "cnic.federal.fee.renewal-urgent";
    const out = applyOverlayToFees(
      FEES,
      [
        {
          entityId: FEE,
          field: "amount",
          version: 2,
          value: 1300,
          effectiveFrom: "2026-10-01T00:00:00Z",
          effectiveUntil: null,
          createdAt: "2026-10-09T00:00:00Z",
          approvedAt: "2026-10-09T00:00:00Z",
          sourceId: "nadra.fee-structure",
        },
      ],
      NOW,
    ).find((f) => f.id === FEE)!;
    expect(out.lastVerifiedAt).toBe("2026-10-09");
    expect(effectiveStatus(out, NOW)).toBe("verified");
  });

  it("the 'official source' explanation does not claim a person checked it", () => {
    expect(statusExplanation("official_source", "en")).toMatch(/No dated check by a person/);
  });
});

describe("government sources and third-party tools are told apart", () => {
  it("classifies by destination, not by the record's status", () => {
    expect(linkOrigin("https://ictadministration.gov.pk/vehicle-transfer/")).toBe("government");
    expect(linkOrigin("https://www.nadra.gov.pk")).toBe("government");
    expect(linkOrigin("tel:+9251111786100")).toBe("phone");
    expect(linkOrigin("https://www.google.com/maps/search/?api=1&query=H-9")).toBe("third_party");
    // look-alike hosts are not government
    expect(linkOrigin("https://gov.pk.evil.example/x")).toBe("third_party");
    expect(linkOrigin("https://notgov.pk/x")).toBe("third_party");
    expect(linkOrigin("not a url")).toBe("third_party");
  });

  it("names Google Maps", () => {
    expect(thirdPartyName("https://www.google.com/maps/search/?api=1&query=x")).toBe("Google Maps");
    expect(thirdPartyName("https://example.com/a")).toBe("example.com");
  });

  it("the only third-party action in the seed is a find-office map link", () => {
    const third = ACTIONS.filter((a) => linkOrigin(a.url) === "third_party");
    expect(third.length).toBeGreaterThan(0);
    expect(third.every((a) => a.kind === "find_office")).toBe(true);
  });

  it("the primary next-step button is never a third-party tool when a government action exists", () => {
    // Step 4 (pay & verify) lists the Maps link before the Excise site in the seed.
    let state = EMPTY_STATE;
    const input = emptyJourneyInput("vehicle-transfer", "ict", {});
    let j = buildJourney(input, state);
    // walk to the 'act' step by completing the earlier ones
    for (const s of j.steps) {
      if (s.record.kind === "act") break;
      state = { ...state, stepOverrides: { ...state.stepOverrides, [s.record.id]: "completed" } };
    }
    j = buildJourney(input, state);
    const step = j.steps[j.currentIndex]!;
    expect(step.record.kind).toBe("act");
    expect(step.actions.some((a) => linkOrigin(a.url) === "third_party")).toBe(true);
    const primary = primaryActionFor(j)!;
    expect(linkOrigin(primary.url)).not.toBe("third_party");
  });
});
