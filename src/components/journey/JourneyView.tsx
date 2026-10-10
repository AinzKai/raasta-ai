import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, Copy, RotateCcw, Save, Share2 } from "lucide-react";

import {
  buildJourney,
  journeyToText,
  primaryActionFor,
  withAnswer,
  type ChecklistStatus,
  type JourneyInput,
  type JourneyState,
} from "@/lib/journey";
import { pick } from "@/lib/knowledge";
import { useKnowledgeVersions } from "@/hooks/useKnowledgeVersions";
import { copyText } from "@/lib/clipboard";
import { useLocale } from "@/lib/i18n";
import { ActionGrid } from "./ActionCard";
import { Checklist } from "./Checklist";
import { FeeCard } from "./FeeCard";
import { JourneyTimeline } from "./JourneyTimeline";
import { NextStepCard } from "./NextStepCard";
import { SourceList, TimelineList, WarningList } from "./Notes";
import { OfficeCard } from "./OfficeCard";
import { ReadinessCard } from "./ReadinessCard";

export type SaveStatus = "unsaved" | "saving" | "saved-local" | "saved-account" | "error";

type Props = {
  input: JourneyInput;
  state: JourneyState;
  onInputChange: (input: JourneyInput) => void;
  onStateChange: (state: JourneyState) => void;
  saveStatus?: SaveStatus;
  onSave?: () => void;
  onRestart?: () => void;
  banner?: ReactNode;
  footer?: ReactNode;
  knowledgeStale?: boolean;
  focus?: "journey" | "fees" | "documents";
  /** Rendered under the checklist, e.g. the document checker. */
  extras?: ReactNode;
};

export function JourneyView({
  input,
  state,
  onInputChange,
  onStateChange,
  saveStatus = "unsaved",
  onSave,
  onRestart,
  banner,
  footer,
  knowledgeStale,
  focus,
  extras,
}: Props) {
  const { lang, T, tf } = useLocale();
  const versions = useKnowledgeVersions();
  const journey = useMemo(() => buildJourney(input, state, { versions }), [input, state, versions]);
  const nextRef = useRef<HTMLElement>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  // Decided after mount: reading `navigator` during render differs between server and browser.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // Mobile: keep the next action reachable once the hero card scrolls away.
  useEffect(() => {
    const el = nextRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setStickyVisible(!!entry && !entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!focus || focus === "journey") return;
    document
      .getElementById(focus === "fees" ? "fees" : "checklist")
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focus]);

  const goToChecklist = () =>
    document.getElementById("checklist")?.scrollIntoView({ block: "start", behavior: "smooth" });

  const setChecklist = (id: string, status: ChecklistStatus | null) => {
    const checklist = { ...state.checklist };
    if (status === null) delete checklist[id];
    else checklist[id] = status;
    onStateChange({ ...state, checklist });
  };
  const setApplies = (id: string, applies: boolean) =>
    onStateChange({ ...state, applies: { ...state.applies, [id]: applies } });
  const setOverride = (stepId: string, value: "completed" | "skipped" | null) => {
    const stepOverrides = { ...state.stepOverrides };
    if (value === null) delete stepOverrides[stepId];
    else stepOverrides[stepId] = value;
    onStateChange({ ...state, stepOverrides });
  };
  const setNote = (stepId: string, text: string) =>
    onStateChange({ ...state, notes: { ...state.notes, [stepId]: text } });

  async function share() {
    const text = journeyToText(journey, state, lang);
    if (canShare) {
      try {
        await navigator.share({ title: pick(journey.serviceName, lang), text });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // user closed the sheet
        // any other share error: fall back to copying below
      }
    }
    const ok = await copyText(text);
    setCopy(ok ? "copied" : "failed");
    setTimeout(() => setCopy("idle"), 2500);
  }

  const primary = primaryActionFor(journey);
  const step = journey.steps[journey.currentIndex];
  const saveLabel =
    saveStatus === "saved-account"
      ? T("savedAccount")
      : saveStatus === "saved-local"
        ? T("savedLocal")
        : saveStatus === "saving"
          ? T("loading")
          : T("saveJourney");

  return (
    <div className="space-y-6">
      {banner}
      {knowledgeStale && (
        <p
          role="status"
          className="rounded-2xl bg-source-tint p-3 text-sm text-ink ring-1 ring-source/30"
        >
          {T("knowledgeUpdated")}
        </p>
      )}

      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          {journey.agencyName} · {pick(journey.jurisdictionName, lang)}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {pick(journey.serviceName, lang)}
        </h1>
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={journey.totalSteps}
            aria-valuenow={journey.completedCount}
            aria-label={tf("stepsDone", {
              done: journey.completedCount,
              total: journey.totalSteps,
            })}
            className="h-2 max-w-xs flex-1 overflow-hidden rounded-full bg-primary-tint"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${journey.progress * 100}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-muted">
            {tf("stepsDone", { done: journey.completedCount, total: journey.totalSteps })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saveStatus === "saving"}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {saveStatus.startsWith("saved") ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              {saveLabel}
            </button>
          )}
          <button
            type="button"
            onClick={share}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface"
          >
            {copy === "copied" ? (
              <Check className="size-4" aria-hidden />
            ) : canShare ? (
              <Share2 className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            {copy === "copied" ? T("copied") : canShare ? T("shareJourney") : T("copyChecklist")}
          </button>
          {onRestart && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(T("restartConfirm"))) onRestart();
              }}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-muted ring-1 ring-line hover:text-ink"
            >
              <RotateCcw className="size-4" aria-hidden />
              {T("restartJourney")}
            </button>
          )}
        </div>
        {copy === "failed" && (
          <p role="alert" className="text-sm font-semibold text-warning">
            {T("copyFailed")}
          </p>
        )}
        {saveStatus === "error" && (
          <p role="alert" className="text-sm font-semibold text-warning">
            {T("saveFailed")}
          </p>
        )}
        <p className="text-sm font-semibold text-muted">{T("mappedRoute")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <NextStepCard
            ref={nextRef}
            journey={journey}
            onPrepare={goToChecklist}
            {...(step ? { onMarkDone: () => setOverride(step.record.id, "completed") } : {})}
          />
          <JourneyTimeline
            journey={journey}
            overrides={state.stepOverrides}
            onOverride={setOverride}
            onNote={setNote}
          />
          <div className="lg:hidden">
            <ReadinessCard readiness={journey.readiness} onComplete={goToChecklist} />
          </div>
          <Checklist journey={journey} onSet={setChecklist} onApplies={setApplies} />
          <FeeCard journey={journey} onAnswer={(k, v) => onInputChange(withAnswer(input, k, v))} />
          <TimelineList timelines={journey.timelines} />
          <WarningList warnings={journey.warnings} />
          {extras}
          <SourceList sources={journey.sources} />
          {footer}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden lg:block">
            <ReadinessCard readiness={journey.readiness} onComplete={goToChecklist} />
          </div>
          <ActionGrid actions={journey.actions} />
          {journey.offices.length > 0 && (
            <section aria-labelledby="office-title" className="space-y-3">
              <h2 id="office-title" className="text-lg font-extrabold tracking-tight text-ink">
                {T("officeTitle")}
              </h2>
              {journey.offices.map((o) => (
                <OfficeCard key={o.id} office={o} />
              ))}
            </section>
          )}
        </aside>
      </div>

      {/* Mobile: the next action stays within thumb reach. */}
      {stickyVisible && !journey.isComplete && step && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-30 px-3 md:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-primary p-3 text-primary-foreground shadow-lift animate-rise-in">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/75">
                {T("nextStep")}
              </p>
              <p className="truncate text-sm font-bold">{pick(step.record.title, lang)}</p>
            </div>
            {primary ? (
              <a
                href={primary.url}
                {...(primary.url.startsWith("tel:")
                  ? {}
                  : { target: "_blank", rel: "noopener noreferrer" })}
                className="touch-target inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-[13px] font-bold text-primary"
              >
                {pick(primary.label, lang)}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
              </a>
            ) : (
              <button
                type="button"
                onClick={goToChecklist}
                className="touch-target shrink-0 rounded-xl bg-surface px-3.5 py-2 text-[13px] font-bold text-primary"
              >
                {T("completePrep")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
