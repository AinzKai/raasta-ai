import { describe, expect, it } from "vitest";
import { AutosaveGate, EMPTY_STATE, emptyJourneyInput, type JourneyState } from "../journey";
import { DEMO_KEY, readJourneys, upsertLocal } from "../journey/local-store";
import { toSaved } from "../../hooks/useJourneys";

const input = emptyJourneyInput("vehicle-transfer", "ict", {});
const changed: JourneyState = { ...EMPTY_STATE, checklist: { "some-item": "ready" } };

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

/**
 * Mirrors the autosave effect in JourneyWorkspace: it runs on mount (and again
 * under React StrictMode's dev double-invoke) and whenever content changes.
 */
function runAutosaveEffect(
  gate: AutosaveGate,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  content: JourneyState,
) {
  if (!gate.isDirty(input, content)) return false;
  const ok = upsertLocal(storage, toSaved(input, content), DEMO_KEY);
  if (ok) gate.markPersisted(input, content);
  return ok;
}

describe("AutosaveGate (demo reset regression)", () => {
  it("does not save an untouched journey, however many times the effect runs", () => {
    const storage = memoryStorage();
    const gate = new AutosaveGate(input, EMPTY_STATE);
    // mount + StrictMode double-invoke + a re-render: three runs, no user change
    for (let i = 0; i < 3; i++) runAutosaveEffect(gate, storage, EMPTY_STATE);
    expect(readJourneys(storage, DEMO_KEY)).toHaveLength(0);
  });

  it("saves once the user actually changes something, and not again until the next change", () => {
    const storage = memoryStorage();
    const gate = new AutosaveGate(input, EMPTY_STATE);
    expect(runAutosaveEffect(gate, storage, changed)).toBe(true);
    expect(readJourneys(storage, DEMO_KEY)[0]?.state.checklist).toEqual({ "some-item": "ready" });
    expect(runAutosaveEffect(gate, storage, changed)).toBe(false);
  });

  it("after Reset the remounted journey leaves storage empty", () => {
    const storage = memoryStorage();
    runAutosaveEffect(new AutosaveGate(input, EMPTY_STATE), storage, changed);
    expect(readJourneys(storage, DEMO_KEY)).toHaveLength(1);

    // Reset: storage is cleared and the workspace remounts from empty state.
    storage.removeItem(DEMO_KEY);
    const remounted = new AutosaveGate(input, EMPTY_STATE);
    for (let i = 0; i < 3; i++) runAutosaveEffect(remounted, storage, EMPTY_STATE);
    expect(storage.getItem(DEMO_KEY)).toBeNull();
  });

  it("resuming a saved journey does not rewrite it until something changes", () => {
    const storage = memoryStorage();
    const gate = new AutosaveGate(input, changed);
    runAutosaveEffect(gate, storage, changed);
    expect(storage.getItem(DEMO_KEY)).toBeNull();
    expect(runAutosaveEffect(gate, storage, EMPTY_STATE)).toBe(true); // user cleared the item
  });

  it("a failed write is not marked persisted, so the next change retries", () => {
    const gate = new AutosaveGate(input, EMPTY_STATE);
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    };
    expect(runAutosaveEffect(gate, failing, changed)).toBe(false);
    expect(gate.isDirty(input, changed)).toBe(true);
  });
});
