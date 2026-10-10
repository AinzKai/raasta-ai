import { useState } from "react";

import type { FeeRecord } from "@/lib/knowledge";
import { effectiveStatus, isTrusted, pick } from "@/lib/knowledge";
import { formatPkr, type Journey } from "@/lib/journey";
import { useLocale } from "@/lib/i18n";
import { ClarifierChips } from "./ClarifierChips";
import { NotVerifiedCard } from "./NotVerifiedCard";
import { TrustBadge } from "./trust";

function FeeRow({ fee }: { fee: FeeRecord }) {
  const { lang, T, tf } = useLocale();
  const trusted = fee.amount !== null && isTrusted(effectiveStatus(fee, new Date()));
  const days =
    fee.processingDays === null
      ? null
      : tf(fee.processingUnit === "working_days" ? "workingDaysShort" : "daysShort", {
          n: fee.processingDays,
        });

  return (
    <li className="rounded-2xl bg-paper/70 p-4 ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <p className="min-w-0 flex-1 font-semibold text-ink">{pick(fee.label, lang)}</p>
        <p
          className={`text-lg font-extrabold tabular-nums ${fee.amount === null ? "text-muted" : "text-ink"}`}
        >
          {fee.amount === null ? T("amountMissing") : formatPkr(fee.amount)}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <TrustBadge record={fee} />
        {days && (
          <span className="text-[12px] font-semibold text-muted">
            {T("processing")}: {days}
            {fee.processingVerification && !isTrusted(fee.processingVerification) ? " ≈" : ""}
          </span>
        )}
      </div>
      {fee.upcoming && (
        <p className="mt-2 rounded-lg bg-source-tint px-3 py-2 text-[12px] font-semibold text-ink">
          {T("feeUpcoming")}: {formatPkr(fee.upcoming.amount)} ·{" "}
          {new Date(fee.upcoming.effectiveFrom).toLocaleDateString(
            lang === "ur" ? "ur-PK" : "en-GB",
            { day: "numeric", month: "short", year: "numeric" },
          )}
        </p>
      )}
      {fee.caveat && (
        <p className="mt-2 rounded-lg bg-warning-tint px-3 py-2 text-[12px] text-ink">
          {pick(fee.caveat, lang)}
        </p>
      )}
      {!trusted && fee.amount !== null && (
        <p className="mt-2 text-[12px] text-muted">{fee.basis}</p>
      )}
    </li>
  );
}

const FEE_CLARIFIER_KEYS = new Set([
  "vehicleType",
  "vehicleBand",
  "situation",
  "pages",
  "validity",
]);

export function FeeCard({
  journey,
  onAnswer,
}: {
  journey: Journey;
  onAnswer: (key: string, value: string) => void;
}) {
  const { T, tf } = useLocale();
  const [showAll, setShowAll] = useState(false);
  const { shown, others } = journey.fees;
  const now = new Date();
  // Amounts backed by an official source but with no dated human check: say so once, plainly.
  const hasUnconfirmedOfficial = [...shown, ...others].some(
    (f) => f.amount !== null && effectiveStatus(f, now) === "official_source",
  );
  const refine =
    journey.pendingClarifier && FEE_CLARIFIER_KEYS.has(journey.pendingClarifier.key)
      ? journey.pendingClarifier
      : null;

  if (shown.length === 0 && others.length === 0)
    return <NotVerifiedCard topic="fee" sourceIds={journey.sources.slice(0, 2).map((s) => s.id)} />;

  return (
    <section id="fees" aria-labelledby="fees-title" className="scroll-mt-24 space-y-3">
      <h2 id="fees-title" className="text-lg font-extrabold tracking-tight text-ink">
        {T("feesTitle")}
      </h2>
      {hasUnconfirmedOfficial && (
        <p className="rounded-2xl bg-source-tint px-4 py-3 text-[13px] text-ink ring-1 ring-source/25">
          {T("feesTrustNote")}
        </p>
      )}
      {refine && (
        <div className="rounded-2xl bg-primary-tint/60 p-4 ring-1 ring-primary/15">
          <ClarifierChips clarifier={refine} onAnswer={onAnswer} hint={T("refineFees")} />
        </div>
      )}
      <ul className="space-y-3">
        {shown.map((f) => (
          <FeeRow key={f.id} fee={f} />
        ))}
      </ul>
      {others.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
            className="touch-target text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {showAll ? T("hideOptions") : tf("showAllOptions", { n: others.length })}
          </button>
          {showAll && (
            <ul className="space-y-3 animate-rise-in">
              {others.map((f) => (
                <FeeRow key={f.id} fee={f} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
