import { CheckCircle2, CircleAlert, CircleDashed, Ban } from "lucide-react";

import type { Readiness } from "@/lib/journey";
import { pick } from "@/lib/knowledge";
import { useLocale } from "@/lib/i18n";

/** Deterministic readiness: ready ÷ required. The number is computed from the checklist, never by a model. */
export function ReadinessCard({
  readiness,
  onComplete,
}: {
  readiness: Readiness;
  onComplete?: () => void;
}) {
  const { lang, T, tf } = useLocale();
  if (readiness.total === 0) return null;

  const outstanding = [
    ...readiness.unavailable.map((r) => ({ r, kind: "unavailable" as const })),
    ...readiness.attention.map((r) => ({ r, kind: "attention" as const })),
    ...readiness.pending.map((r) => ({ r, kind: "pending" as const })),
  ];
  const allReady = readiness.level === "ready";

  return (
    <section
      aria-labelledby="readiness-title"
      className="rounded-3xl bg-surface p-5 ring-1 ring-line"
    >
      <h2 id="readiness-title" className="text-xs font-bold uppercase tracking-wider text-muted">
        {T("yourReadiness")}
      </h2>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
        {tf("readyPct", { pct: readiness.percent })}
      </p>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={readiness.percent}
        aria-label={tf("readyPct", { pct: readiness.percent })}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-primary-tint"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${readiness.percent}%` }}
        />
      </div>
      <p className="mt-2 text-[12px] text-muted">
        {tf("readyFormula", { ready: readiness.ready, total: readiness.total })} · {T("readyNote")}
      </p>

      <p className="mt-3 text-sm font-semibold text-ink" aria-live="polite">
        {allReady
          ? T("allReady")
          : readiness.remaining === 1
            ? T("remainingOne")
            : tf("remainingMany", { n: readiness.remaining })}
      </p>

      {!allReady && outstanding.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {outstanding.slice(0, 4).map(({ r, kind }) => (
            <li key={r.id} className="flex items-start gap-2 text-[13px] text-ink">
              {kind === "unavailable" ? (
                <Ban className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              ) : kind === "attention" ? (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              ) : (
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              )}
              <span className="line-clamp-2">{pick(r.label, lang)}</span>
            </li>
          ))}
        </ul>
      )}
      {allReady && <CheckCircle2 className="mt-3 size-6 text-primary" aria-hidden />}

      {!allReady && onComplete && (
        <button
          type="button"
          onClick={onComplete}
          className="touch-target mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          {T("completePrep")}
        </button>
      )}
    </section>
  );
}
