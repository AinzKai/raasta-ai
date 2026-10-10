import { useState } from "react";
import { Ban, Check, CircleAlert, CircleHelp, Minus } from "lucide-react";

import { linkOrigin, pick } from "@/lib/knowledge";
import type { Journey, JourneyStep, StepStatus } from "@/lib/journey";
import { useLocale } from "@/lib/i18n";
import type { CopyKey } from "@/lib/copy";
import { OriginTag, TrustBadge } from "./trust";

const LABEL: Record<StepStatus, CopyKey> = {
  completed: "statusCompleted",
  current: "statusCurrent",
  locked: "statusLocked",
  "needs-attention": "statusAttention",
  blocked: "statusBlocked",
  skipped: "statusSkipped",
  "not-verified": "statusNotVerified",
};

function Node({ status, n }: { status: StepStatus; n: number }) {
  const base =
    "relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold ring-2";
  switch (status) {
    case "completed":
      return (
        <span
          className={`${base} animate-node-pop bg-primary text-primary-foreground ring-primary`}
        >
          <Check className="size-4" aria-hidden />
        </span>
      );
    case "current":
      return (
        <span className={`${base} animate-here bg-surface text-primary ring-primary`}>{n}</span>
      );
    case "needs-attention":
      return (
        <span className={`${base} bg-warning-tint text-warning ring-warning`}>
          <CircleAlert className="size-4" aria-hidden />
        </span>
      );
    case "blocked":
      return (
        <span className={`${base} bg-ink text-primary-foreground ring-ink`}>
          <Ban className="size-4" aria-hidden />
        </span>
      );
    case "not-verified":
      return (
        <span className={`${base} bg-surface text-muted ring-line`}>
          <CircleHelp className="size-4" aria-hidden />
        </span>
      );
    case "skipped":
      return (
        <span className={`${base} bg-surface text-muted ring-line`}>
          <Minus className="size-4" aria-hidden />
        </span>
      );
    default:
      return <span className={`${base} bg-paper text-muted ring-line`}>{n}</span>;
  }
}

function StepItem({
  step,
  isLast,
  hasOverride,
  onOverride,
  onNote,
}: {
  step: JourneyStep;
  isLast: boolean;
  hasOverride: boolean;
  onOverride: (stepId: string, value: "completed" | "skipped" | null) => void;
  onNote: (stepId: string, text: string) => void;
}) {
  const { lang, T } = useLocale();
  const active =
    step.status === "current" ||
    step.status === "needs-attention" ||
    step.status === "blocked" ||
    step.status === "not-verified";
  const [open, setOpen] = useState(active);
  const done = step.status === "completed" || step.status === "skipped";
  const counted = step.requirements.filter((r) => r.counts);
  const readyCount = counted.filter((r) => r.status === "ready").length;
  const panelId = `step-panel-${step.record.id}`;
  const rec = step.record;

  return (
    <li
      className="relative flex gap-4 pb-6 last:pb-0"
      aria-current={step.status === "current" ? "step" : undefined}
    >
      {!isLast && (
        <span
          aria-hidden
          className={`absolute left-[17px] top-9 bottom-0 w-0.5 rounded-full ${done ? "route-line-done" : "route-line"}`}
        />
      )}
      <Node status={step.status} n={step.index + 1} />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="touch-target -my-1 flex w-full items-start justify-between gap-3 py-1 text-start"
        >
          <span className="min-w-0">
            {step.status === "current" && (
              <span className="mb-1 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-foreground">
                {T("youAreHere")}
              </span>
            )}
            <span className={`block font-bold ${done ? "text-muted" : "text-ink"}`}>
              {pick(rec.title, lang)}
            </span>
            <span className="mt-0.5 block text-[12px] font-semibold text-muted">
              {T(LABEL[step.status])}
              {counted.length > 0 && ` · ${readyCount}/${counted.length}`}
            </span>
          </span>
        </button>

        {open && (
          <div id={panelId} className="mt-3 space-y-3 animate-rise-in">
            <p className="text-sm text-muted">{pick(rec.detail, lang)}</p>
            {!rec.guidance && <TrustBadge record={rec} />}

            {step.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {step.actions.map((a) => {
                  const thirdParty = linkOrigin(a.url) === "third_party";
                  return (
                    <span key={a.id} className="inline-flex flex-col items-start gap-1">
                      <a
                        href={a.url}
                        {...(a.url.startsWith("tel:")
                          ? {}
                          : { target: "_blank", rel: "noopener noreferrer" })}
                        className={`touch-target inline-flex items-center rounded-xl px-3.5 py-2 text-[13px] font-semibold ${
                          thirdParty
                            ? "border border-dashed border-muted/60 text-ink hover:bg-surface"
                            : "text-primary ring-1 ring-primary/30 hover:bg-primary-tint"
                        }`}
                      >
                        {pick(a.label, lang)}
                      </a>
                      {thirdParty && <OriginTag url={a.url} />}
                    </span>
                  );
                })}
              </div>
            )}

            <label className="block">
              <span className="text-[12px] font-semibold text-muted">{T("stepNote")}</span>
              <textarea
                value={step.note}
                onChange={(e) => onNote(rec.id, e.target.value)}
                maxLength={2000}
                rows={2}
                placeholder={T("stepNotePlaceholder")}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus-visible:outline-primary"
              />
            </label>

            {rec.kind !== "confirm" && (
              <div className="flex flex-wrap gap-2">
                {step.status === "completed" && hasOverride ? (
                  <button
                    type="button"
                    onClick={() => onOverride(rec.id, null)}
                    className="touch-target rounded-xl px-3.5 py-2 text-[13px] font-semibold text-muted ring-1 ring-line hover:text-ink"
                  >
                    {T("undoStep")}
                  </button>
                ) : step.status !== "locked" && step.status !== "completed" ? (
                  <button
                    type="button"
                    onClick={() => onOverride(rec.id, "completed")}
                    className="touch-target rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
                  >
                    {T("markStepDone")}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function JourneyTimeline({
  journey,
  overrides,
  onOverride,
  onNote,
}: {
  journey: Journey;
  overrides: Record<string, "completed" | "skipped">;
  onOverride: (stepId: string, value: "completed" | "skipped" | null) => void;
  onNote: (stepId: string, text: string) => void;
}) {
  const { T } = useLocale();
  return (
    <section aria-labelledby="route-title" className="rounded-3xl bg-surface p-5 ring-1 ring-line">
      <h2 id="route-title" className="mb-5 text-lg font-extrabold tracking-tight text-ink">
        {T("yourRoute")}
      </h2>
      <ol>
        {journey.steps.map((s, i) => (
          <StepItem
            key={s.record.id}
            step={s}
            isLast={i === journey.steps.length - 1}
            hasOverride={overrides[s.record.id] !== undefined}
            onOverride={onOverride}
            onNote={onNote}
          />
        ))}
      </ol>
    </section>
  );
}
