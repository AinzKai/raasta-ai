import { describe, expect, it } from "vitest";
import {
  EMPTY_STATE,
  JourneyError,
  buildJourney,
  computeReadiness,
  emptyJourneyInput,
  journeyToText,
  parseInput,
  parseState,
  primaryActionFor,
  withAnswer,
  type JourneyState,
} from "../journey";
import {
  DEMO_KEY,
  readJourneys,
  removeLocal,
  upsertLocal,
  writeJourneys,
} from "../journey/local-store";
import { getRequirements, getRequirements as reqs } from "../knowledge";
import type { PublishedVersion } from "../freshness/types";

const ict = emptyJourneyInput("vehicle-transfer", "ict");
const required = reqs("vehicle-transfer", "ict").filter((r) => r.required);
const stateWith = (
  ids: string[],
  status: "ready" | "attention" | "unavailable" = "ready",
): JourneyState => ({
  ...EMPTY_STATE,
  checklist: Object.fromEntries(ids.map((id) => [id, status])),
  applies: {},
  stepOverrides: {},
  notes: {},
});

describe("buildJourney", () => {
  it("builds the Islamabad vehicle-transfer journey from verified records", () => {
    const j = buildJourney(ict);
    expect(j.steps.map((s) => s.record.kind)).toEqual([
      "confirm",
      "prepare",
      "verify",
      "act",
      "track",
    ]);
    expect(j.agencyName).toBe("Islamabad Excise");
    expect(j.sources.length).toBeGreaterThan(2);
    expect(j.offices[0]?.address).toContain("H-9");
    expect(j.actions.every((a) => /^(https:\/\/|tel:)/.test(a.url))).toBe(true);
  });
  it("starts on step 2 because jurisdiction is already confirmed", () => {
    const j = buildJourney(ict);
    expect(j.steps[0]!.status).toBe("completed");
    expect(j.currentIndex).toBe(1);
    expect(j.steps[1]!.status).toBe("current");
    expect(j.steps[2]!.status).toBe("locked");
  });
  it("refuses unsupported jurisdictions and unknown services instead of guessing", () => {
    expect(() => buildJourney(emptyJourneyInput("vehicle-transfer", "punjab"))).toThrow(
      JourneyError,
    );
    expect(() => buildJourney(emptyJourneyInput("nope", "federal"))).toThrow(JourneyError);
  });
  it("CNIC stays on the confirm step until the situation is known", () => {
    const j = buildJourney(emptyJourneyInput("cnic", "federal"));
    expect(j.currentIndex).toBe(0);
    const j2 = buildJourney(emptyJourneyInput("cnic", "federal", { situation: "renew" }));
    expect(j2.steps[0]!.status).toBe("completed");
  });
  it("every service can build a journey", () => {
    for (const [s, jur] of [
      ["cnic", "federal"],
      ["passport", "federal"],
      ["birth-certificate", "federal"],
      ["ntn-tax-filing", "federal"],
      ["police-character-certificate", "ict"],
      ["domicile", "ict"],
    ] as const) {
      expect(buildJourney(emptyJourneyInput(s, jur)).steps.length).toBeGreaterThan(2);
    }
  });
  it("withAnswer resets dependent answers", () => {
    const a = withAnswer(withAnswer(ict, "vehicleType", "car"), "vehicleBand", "1800");
    expect(withAnswer(a, "vehicleType", "bike").answers).toEqual({ vehicleType: "bike" });
  });
});

describe("readiness is deterministic", () => {
  it("starts at 0% and counts only required items", () => {
    const j = buildJourney(ict);
    expect(j.readiness).toMatchObject({
      total: required.length,
      ready: 0,
      percent: 0,
      level: "not-started",
    });
  });
  it("is exactly ready ÷ required", () => {
    const half = required.slice(0, required.length / 2).map((r) => r.id);
    const j = buildJourney(ict, stateWith(half));
    expect(j.readiness.percent).toBe(Math.round((half.length / required.length) * 100));
    expect(buildJourney(ict, stateWith(half)).readiness).toEqual(j.readiness);
  });
  it("optional documents count only when the user says they apply", () => {
    const optional = getRequirements("vehicle-transfer", "ict").find((r) => !r.required)!;
    const base = buildJourney(ict).readiness.total;
    const applies = buildJourney(ict, { ...EMPTY_STATE, applies: { [optional.id]: true } })
      .readiness.total;
    expect(applies).toBe(base + 1);
  });
  it("reports attention and blocked states", () => {
    const j = buildJourney(ict, stateWith([required[0]!.id], "unavailable"));
    expect(j.readiness.level).toBe("blocked");
    expect(j.readiness.unavailable).toHaveLength(1);
    expect(computeReadiness([], EMPTY_STATE).percent).toBe(0);
  });
  it("is 100% / ready when everything required is ready, and the journey advances", () => {
    const all = stateWith(required.map((r) => r.id));
    const j = buildJourney(ict, all);
    expect(j.readiness).toMatchObject({ percent: 100, level: "ready", remaining: 0 });
    expect(j.steps[1]!.status).toBe("completed");
    expect(j.steps[2]!.status).toBe("completed");
    expect(j.steps[3]!.status).toBe("current");
  });
  it("marking an item needs-attention flags the current step", () => {
    const prep = required.find((r) => r.stepId.endsWith(".prepare"))!;
    const j = buildJourney(ict, stateWith([prep.id], "attention"));
    expect(j.steps[1]!.status).toBe("needs-attention");
  });
  it("a manual completion of every step finishes the journey", () => {
    const overrides = Object.fromEntries(
      buildJourney(ict).steps.map((s) => [s.record.id, "completed" as const]),
    );
    const j = buildJourney(ict, { ...EMPTY_STATE, stepOverrides: overrides });
    expect(j.isComplete).toBe(true);
    expect(j.progress).toBe(1);
  });
});

describe("actions and export", () => {
  it("the current step exposes an official primary action", () => {
    const j = buildJourney(
      ict,
      stateWith(required.filter((r) => r.stepId.endsWith(".prepare")).map((r) => r.id)),
    );
    expect(primaryActionFor(buildJourney(ict))?.url).toMatch(
      /^https:\/\/ictadministration\.gov\.pk/,
    );
    expect(j.currentIndex).toBe(2);
  });
  it("exported checklist only prints trusted amounts and cites sources", () => {
    const text = journeyToText(buildJourney(ict, EMPTY_STATE, {}), EMPTY_STATE, "en");
    expect(text).toContain("PKR 2,750");
    expect(text).toContain("https://ictadministration.gov.pk");
    expect(text).not.toContain("1,200"); // superseded legacy fee
    const bikes = journeyToText(
      buildJourney(emptyJourneyInput("vehicle-transfer", "ict", { vehicleType: "bike" })),
      EMPTY_STATE,
      "en",
    );
    expect(bikes).not.toMatch(/Motorbike — up to 200 cc: PKR/); // needs confirmation → not exported as a trusted amount
  });
  it("renders in Urdu and Roman Urdu without falling back to keys", () => {
    for (const lang of ["ur", "roman"] as const)
      expect(journeyToText(buildJourney(ict), EMPTY_STATE, lang)).not.toMatch(
        /readyPct|requiredDocs/,
      );
  });
});

describe("approved knowledge versions flow into journeys", () => {
  const v = (value: number, effectiveFrom: string | null): PublishedVersion => ({
    entityId: "vehicle-transfer.ict.fee.car-1000",
    field: "amount",
    version: 2,
    value,
    effectiveFrom,
    effectiveUntil: null,
    createdAt: "2026-10-09T00:00:00Z",
    approvedAt: "2026-10-09T00:00:00Z",
    sourceId: "ict-excise.transfer-fee-notification",
  });
  const feeOf = (j: ReturnType<typeof buildJourney>) =>
    [...j.fees.shown, ...j.fees.others].find((f) => f.id === "vehicle-transfer.ict.fee.car-1000")!;
  it("shows the seed with no versions, the approved value once active, and the upcoming one before its date", () => {
    expect(feeOf(buildJourney(ict)).amount).toBe(2750);
    expect(
      feeOf(
        buildJourney(ict, EMPTY_STATE, {
          versions: [v(3000, "2026-10-01T00:00:00Z")],
          now: new Date("2026-10-09"),
        }),
      ).amount,
    ).toBe(3000);
    const upcoming = feeOf(
      buildJourney(ict, EMPTY_STATE, {
        versions: [v(3000, "2026-11-01T00:00:00Z")],
        now: new Date("2026-10-09"),
      }),
    );
    expect(upcoming.amount).toBe(2750);
    expect(upcoming.upcoming?.amount).toBe(3000);
  });
});

describe("stored state is never trusted", () => {
  it("parseState / parseInput turn junk into a clean slate or null", () => {
    expect(parseState({ checklist: { a: "hacked" } })).toEqual(EMPTY_STATE);
    expect(parseState("nope")).toEqual(EMPTY_STATE);
    expect(parseInput({ serviceId: "x", jurisdictionId: "mars", answers: {} })).toBeNull();
    expect(
      parseInput({
        serviceId: "cnic",
        jurisdictionId: "federal",
        answers: { situation: "renew" },
        evil: 1,
      }),
    ).toBeNull();
  });
  const fake = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    };
  };
  const saved = (id: string) => ({
    id,
    input: ict,
    state: EMPTY_STATE,
    status: "active" as const,
    title: "t",
    knowledgeVersion: "x",
    createdAt: "a",
    updatedAt: "b",
    completedAt: null,
  });
  it("round-trips, replaces and removes local journeys", () => {
    const s = fake();
    expect(upsertLocal(s, saved("1"))).toBe(true);
    expect(upsertLocal(s, saved("1"))).toBe(true);
    expect(upsertLocal(s, saved("2"))).toBe(true);
    expect(readJourneys(s).map((j) => j.id)).toEqual(["2", "1"]);
    removeLocal(s, "1");
    expect(readJourneys(s)).toHaveLength(1);
    expect(readJourneys(s, DEMO_KEY)).toEqual([]);
  });
  it("corrupt storage reads as empty and a full disk reports failure", () => {
    const s = fake();
    s.setItem("raasta.journeys.v1", "{not json");
    expect(readJourneys(s)).toEqual([]);
    s.setItem("raasta.journeys.v1", JSON.stringify([{ id: 1 }]));
    expect(readJourneys(s)).toEqual([]);
    expect(
      writeJourneys(
        {
          ...s,
          setItem: () => {
            throw new Error("quota");
          },
        },
        [],
      ),
    ).toBe(false);
  });
});
