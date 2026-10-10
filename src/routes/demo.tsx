import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { JourneyWorkspace } from "@/components/journey/JourneyWorkspace";
import { useJourneys, toSaved } from "@/hooks/useJourneys";
import {
  EMPTY_STATE,
  emptyJourneyInput,
  type JourneyState,
  type SavedJourney,
} from "@/lib/journey";
import { DEMO_KEY, newId, readJourneys, upsertLocal } from "@/lib/journey/local-store";
import { useLocale } from "@/lib/i18n";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Live demo — Raasta" },
      {
        name: "description",
        content:
          "Try a real Raasta journey — transferring a used car in Islamabad — with no account.",
      },
    ],
  }),
  component: Demo,
});

const DEMO_INPUT = emptyJourneyInput("vehicle-transfer", "ict", {});

/**
 * Demo mode: the real knowledge layer and the real journey engine, seeded with
 * the Islamabad vehicle-transfer journey. Nothing is faked; progress is kept
 * only in this browser and can be reset.
 */
function Demo() {
  const { T } = useLocale();
  const store = useJourneys();
  const [ready, setReady] = useState(false);
  const [initial, setInitial] = useState<{ state?: JourneyState; saved: SavedJourney | null }>({
    saved: null,
  });
  const [epoch, setEpoch] = useState(0);
  const flushRef = useRef<(() => void) | null>(null);
  const [keep, setKeep] = useState<"idle" | "saving" | "saved-local" | "saved-account" | "error">(
    "idle",
  );

  useEffect(() => {
    const existing = readJourneys(window.localStorage, DEMO_KEY)[0] ?? null;
    setInitial(existing ? { state: existing.state, saved: existing } : { saved: null });
    setReady(true);
  }, [epoch]);

  const persist = async (saved: SavedJourney) => {
    if (!upsertLocal(window.localStorage, saved, DEMO_KEY)) throw new Error("storage");
    return "saved-local" as const;
  };

  // Copies the demo into the visitor's own journeys and says honestly where it went.
  async function keepJourney() {
    setKeep("saving");
    try {
      flushRef.current?.(); // include a change still waiting on the autosave debounce
      const current = readJourneys(window.localStorage, DEMO_KEY)[0];
      const base = current ?? toSaved(DEMO_INPUT, EMPTY_STATE);
      setKeep(await store.save({ ...base, id: newId() }));
    } catch {
      setKeep("error");
    }
  }

  function reset() {
    window.localStorage.removeItem(DEMO_KEY);
    setKeep("idle");
    setReady(false);
    setEpoch((n) => n + 1);
  }

  if (!ready)
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div role="status" className="h-64 animate-pulse rounded-3xl bg-surface ring-1 ring-line">
          <span className="sr-only">{T("loading")}</span>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <JourneyWorkspace
        key={epoch}
        initialInput={initial.saved?.input ?? DEMO_INPUT}
        {...(initial.state ? { initialState: initial.state } : {})}
        saved={initial.saved}
        persist={persist}
        autosave
        flushRef={flushRef}
        onRestart={reset}
        banner={
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-source-tint p-3 text-sm text-ink ring-1 ring-source/30">
            <p className="font-semibold">{T("demoBanner")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="touch-target rounded-xl px-3.5 py-2 text-[13px] font-semibold ring-1 ring-line hover:bg-surface"
              >
                {T("resetDemo")}
              </button>
              <button
                type="button"
                onClick={() => void keepJourney()}
                disabled={keep === "saving"}
                className="touch-target rounded-xl bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                {keep === "saving" ? T("loading") : T("demoKeep")}
              </button>
            </div>
            {keep === "saved-local" || keep === "saved-account" ? (
              <p role="status" className="basis-full text-[13px] font-semibold text-primary">
                {keep === "saved-account" ? T("savedAccount") : T("savedLocal")} ·{" "}
                <Link to="/journeys" className="underline underline-offset-4">
                  {T("navJourneys")}
                </Link>
              </p>
            ) : keep === "error" ? (
              <p role="alert" className="basis-full text-[13px] font-semibold text-warning">
                {T("saveFailed")}
              </p>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
