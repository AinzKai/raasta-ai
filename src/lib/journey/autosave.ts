import type { JourneyInput, JourneyState } from "./types";

/** Stable text form of what autosave persists: the answers and the progress. */
export function fingerprint(input: JourneyInput, state: JourneyState): string {
  return JSON.stringify([input, state]);
}

/**
 * Decides whether an autosave is needed: only when the content differs from
 * what is already persisted (or from what the journey started with).
 *
 * This replaces a "skip the first effect run" flag. That flag broke whenever an
 * effect ran more than once without any user change — React StrictMode's dev
 * double-invoke, or a remount after "Reset demo" — and silently wrote an empty,
 * untouched record (one that "reappeared" about a second after a reset).
 * Comparing content makes the question "did anything actually change?", which
 * has the same answer however many times the effect runs.
 */
export class AutosaveGate {
  private baseline: string;

  constructor(input: JourneyInput, state: JourneyState) {
    this.baseline = fingerprint(input, state);
  }

  isDirty(input: JourneyInput, state: JourneyState): boolean {
    return fingerprint(input, state) !== this.baseline;
  }

  /** Call after content was successfully persisted. */
  markPersisted(input: JourneyInput, state: JourneyState): void {
    this.baseline = fingerprint(input, state);
  }
}
