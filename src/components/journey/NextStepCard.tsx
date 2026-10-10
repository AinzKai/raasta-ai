import { forwardRef } from "react";
import { ArrowRight, Check, PartyPopper } from "lucide-react";

import { primaryActionFor, type Journey } from "@/lib/journey";
import { pick } from "@/lib/knowledge";
import { useLocale } from "@/lib/i18n";
import { OriginTag, TrustBadge } from "./trust";

type Props = {
  journey: Journey;
  onPrepare: () => void;
  /** Marks the current step complete (for steps the app cannot detect on its own). */
  onMarkDone?: () => void;
};

export const NextStepCard = forwardRef<HTMLElement, Props>(function NextStepCard(
  { journey, onPrepare, onMarkDone },
  ref,
) {
  const { lang, T, tf } = useLocale();

  if (journey.isComplete) {
    return (
      <section
        ref={ref}
        aria-labelledby="next-title"
        className="rounded-3xl bg-primary p-6 text-primary-foreground"
      >
        <PartyPopper className="size-7" aria-hidden />
        <h2 id="next-title" className="mt-3 text-xl font-extrabold">
          {T("journeyDone")}
        </h2>
        <p className="mt-1 text-sm text-primary-foreground/85">{T("journeyDoneBody")}</p>
      </section>
    );
  }

  const step = journey.steps[journey.currentIndex];
  if (!step) return null;
  const action = primaryActionFor(journey);
  const needsPrep = step.record.kind === "prepare" || step.record.kind === "verify";
  // Preparing/verifying finish themselves when the checklist is ready; the
  // other steps (pay, track) can only be confirmed by the person doing them.
  const canMarkDone = !!onMarkDone && !needsPrep && step.record.kind !== "confirm";

  return (
    <section
      ref={ref}
      aria-labelledby="next-title"
      className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-lift"
    >
      <p
        id="next-title"
        className="text-[11px] font-bold uppercase tracking-wider text-primary-foreground/75"
      >
        {T("nextStep")} · {tf("stepOf", { n: step.index + 1, total: journey.totalSteps })}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight">
        {pick(step.record.title, lang)}
      </h2>
      <p className="mt-2 text-sm text-primary-foreground/85">{pick(step.record.detail, lang)}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {action ? (
          <a
            href={action.url}
            {...(action.url.startsWith("tel:")
              ? {}
              : { target: "_blank", rel: "noopener noreferrer" })}
            className="touch-target inline-flex items-center gap-2 rounded-2xl bg-surface px-5 py-3 text-sm font-bold text-primary hover:bg-primary-tint"
          >
            {pick(action.label, lang)}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </a>
        ) : needsPrep ? (
          <button
            type="button"
            onClick={onPrepare}
            className="touch-target inline-flex items-center gap-2 rounded-2xl bg-surface px-5 py-3 text-sm font-bold text-primary hover:bg-primary-tint"
          >
            {T("completePrep")}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </button>
        ) : null}
        {canMarkDone && (
          <button
            type="button"
            onClick={onMarkDone}
            className={`touch-target inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold ${
              action
                ? "text-primary-foreground ring-1 ring-primary-foreground/40 hover:bg-primary-foreground/10"
                : "bg-surface text-primary hover:bg-primary-tint"
            }`}
          >
            <Check className="size-4" aria-hidden />
            {T("markStepDone")}
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!step.record.guidance && (
          <span className="rounded-full bg-surface/95 p-0.5">
            <TrustBadge record={step.record} />
          </span>
        )}
        {action && <OriginTag url={action.url} />}
      </div>
    </section>
  );
});
