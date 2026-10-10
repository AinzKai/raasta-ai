import { Check } from "lucide-react";
import { useMemo } from "react";

import {
  buildJourney,
  emptyJourneyInput,
  type ChecklistStatus,
  type JourneyState,
} from "@/lib/journey";
import { pick, getRequirements } from "@/lib/knowledge";
import { useLocale } from "@/lib/i18n";

/**
 * A real journey rendered small, for the landing page. It is built by the same
 * engine as the product: documents ready, token tax still to check.
 */
export function JourneyPreview() {
  const { lang, T, tf } = useLocale();
  const journey = useMemo(() => {
    const input = emptyJourneyInput("vehicle-transfer", "ict", {});
    const checklist: Record<string, ChecklistStatus> = {};
    for (const r of getRequirements("vehicle-transfer", "ict")) {
      if (r.required && r.stepId.endsWith(".prepare")) checklist[r.id] = "ready";
    }
    const state: JourneyState = { checklist, applies: {}, stepOverrides: {}, notes: {} };
    return buildJourney(input, state);
  }, []);

  return (
    <div
      className="rounded-3xl bg-surface p-5 shadow-lift ring-1 ring-line"
      role="img"
      aria-label={`${T("previewLabel")}: ${pick(journey.serviceName, lang)}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {T("previewLabel")}
          </p>
          <p className="mt-0.5 text-lg font-extrabold text-ink">
            {pick(journey.serviceName, lang)}
          </p>
          <p className="text-[12px] text-muted">
            {journey.agencyName} · {pick(journey.jurisdictionName, lang)}
          </p>
        </div>
        <p className="text-end text-2xl font-extrabold text-primary">
          {journey.readiness.percent}%
        </p>
      </div>
      <ol className="mt-4 space-y-3" aria-hidden>
        {journey.steps.map((s, i) => {
          const done = s.status === "completed";
          const current = i === journey.currentIndex;
          return (
            <li key={s.record.id} className="relative flex items-center gap-3">
              {i < journey.steps.length - 1 && (
                <span
                  className={`absolute start-[13px] top-7 h-4 w-0.5 ${done ? "route-line-done" : "route-line"}`}
                />
              )}
              <span
                className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ring-2 ${done ? "bg-primary text-primary-foreground ring-primary" : current ? "animate-here bg-surface text-primary ring-primary" : "bg-paper text-muted ring-line"}`}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={`text-sm ${current ? "font-extrabold text-ink" : done ? "font-semibold text-muted" : "text-muted"}`}
              >
                {pick(s.record.title, lang)}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 rounded-2xl bg-primary-tint p-3 text-[13px] font-semibold text-primary">
        {tf("readyPct", { pct: journey.readiness.percent })} ·{" "}
        {journey.readiness.remaining === 1
          ? T("remainingOne")
          : tf("remainingMany", { n: journey.readiness.remaining })}
      </div>
    </div>
  );
}
