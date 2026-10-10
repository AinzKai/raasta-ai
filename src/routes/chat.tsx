import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";

import { GoalInput } from "@/components/GoalInput";
import { ClarifierChips } from "@/components/journey/ClarifierChips";
import { JourneyWorkspace } from "@/components/journey/JourneyWorkspace";
import { NotVerifiedCard } from "@/components/journey/NotVerifiedCard";
import { askRaasta } from "@/lib/assistant.functions";
import { copy, tf } from "@/lib/copy";
import { resolveAnswer, type GroundedAnswer } from "@/lib/grounding";
import { useJourneys } from "@/hooks/useJourneys";
import { useLocale } from "@/lib/i18n";
import {
  getService,
  listServices,
  pick,
  getJurisdiction,
  type Answers,
  type JurisdictionId,
  type Lang,
} from "@/lib/knowledge";
import type { JourneyInput } from "@/lib/journey";

type Search = { q?: string; service?: string };

export const Route = createFileRoute("/chat")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(typeof s["q"] === "string" ? { q: s["q"].slice(0, 1500) } : {}),
    ...(typeof s["service"] === "string" ? { service: s["service"].slice(0, 80) } : {}),
  }),
  head: () => ({ meta: [{ title: "Start a journey — Raasta" }] }),
  component: StartJourney,
});

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; rateLimited: boolean; offline: boolean }
  | { kind: "answer"; answer: GroundedAnswer; engine: "model" | "fallback" };

function StartJourney() {
  const search = Route.useSearch();
  const { lang, setLang, T } = useLocale();
  const store = useJourneys();
  const [goal, setGoal] = useState(search.q ?? "");
  const [asked, setAsked] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [context, setContext] = useState<{ serviceId: string | null; answers: Answers }>({
    serviceId: null,
    answers: {},
  });
  const seq = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const show = useCallback(
    (answer: GroundedAnswer, engine: "model" | "fallback") => {
      // Writing in Urdu / Roman Urdu flips the interface to match.
      if (answer.language !== "en" && answer.language !== lang) setLang(answer.language);
      if (answer.kind === "journey")
        setContext({ serviceId: answer.input.serviceId, answers: answer.input.answers });
      else if (answer.kind === "clarify")
        setContext({ serviceId: answer.serviceId, answers: answer.answers });
      setPhase({ kind: "answer", answer, engine });
    },
    [lang, setLang],
  );

  const ask = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (question.length < 2) return;
      const id = ++seq.current;
      setAsked(question);
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setPhase({ kind: "error", rateLimited: false, offline: true });
        return;
      }
      setPhase({ kind: "loading" });
      try {
        const res = await askRaasta({ data: { question, context } });
        if (id === seq.current) show(res.answer, res.meta.engine);
      } catch (e) {
        if (id !== seq.current) return;
        const message = e instanceof Error ? e.message : "";
        setPhase({ kind: "error", rateLimited: /too many/i.test(message), offline: false });
      }
    },
    [context, show],
  );

  // Arrive from the landing page or a service page.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (search.q) void ask(search.q);
    else if (search.service && getService(search.service)) {
      setAsked(pick(getService(search.service)!.name, lang));
      show(
        resolveAnswer({
          language: lang,
          topic: "journey",
          service_id: search.service,
          jurisdiction_id: null,
          answers: {},
        }),
        "fallback",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase.kind === "answer")
      resultRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [phase.kind]);

  /** A chip tap is a user-provided answer — resolved locally with no AI call. */
  function answerClarifier(serviceId: string, answers: Answers, key: string, value: string) {
    const next = { ...answers, [key]: value };
    show(
      resolveAnswer({
        language: lang,
        topic: "journey",
        service_id: serviceId,
        jurisdiction_id: null,
        answers: next,
      }),
      "fallback",
    );
  }

  function startService(serviceId: string) {
    setAsked(pick(getService(serviceId)!.name, lang));
    show(
      resolveAnswer({
        language: lang,
        topic: "journey",
        service_id: serviceId,
        jurisdiction_id: null,
        answers: {},
      }),
      "fallback",
    );
  }

  const loading = phase.kind === "loading";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="sr-only">{T("navStart")}</h1>
        <GoalInput
          value={goal}
          onChange={setGoal}
          onSubmit={() => void ask(goal)}
          disabled={loading}
          autoFocus={!search.q && !search.service}
          buttonLabel={T("startJourney")}
        />
        {phase.kind === "idle" && (
          <div className="mt-6 flex flex-wrap gap-2">
            {(["exampleCar", "exampleCnic", "examplePassport", "exampleLost"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setGoal(copy(k, lang));
                  void ask(copy(k, lang));
                }}
                className="touch-target rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink ring-1 ring-line hover:bg-primary-tint hover:text-primary"
              >
                {copy(k, lang)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={resultRef} className="mt-8 scroll-mt-24" aria-live="polite">
        {asked && phase.kind !== "idle" && (
          <p className="mx-auto mb-6 max-w-3xl text-sm text-muted">
            <span className="font-bold text-ink">{T("yourGoal")}:</span> “{asked}”
          </p>
        )}

        {phase.kind === "loading" && (
          <div role="status" className="mx-auto max-w-3xl space-y-4">
            <div className="flex items-center gap-3 text-ink">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
              <div>
                <p className="font-bold">{T("mapping")}</p>
                <p className="text-sm text-muted">{T("mappingSub")}</p>
              </div>
            </div>
            <div className="h-32 animate-pulse rounded-3xl bg-primary/10" />
            <div className="h-48 animate-pulse rounded-3xl bg-surface ring-1 ring-line" />
          </div>
        )}

        {phase.kind === "error" && (
          <div
            role="alert"
            className="mx-auto max-w-3xl rounded-3xl bg-surface p-6 ring-1 ring-line"
          >
            {phase.offline ? <WifiOff className="size-6 text-muted" aria-hidden /> : null}
            <p className="mt-1 font-bold text-ink">
              {phase.offline ? T("offlineFallbackTitle") : T("errorTitle")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {phase.offline
                ? T("offlineFallbackBody")
                : phase.rateLimited
                  ? T("rateLimited")
                  : T("errorBody")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void ask(asked || goal)}
                className="touch-target rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                {T("tryAgain")}
              </button>
              <Link
                to="/journeys"
                className="touch-target inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-ink ring-1 ring-line"
              >
                {T("navJourneys")}
              </Link>
            </div>
          </div>
        )}

        {phase.kind === "answer" && (
          <AnswerView
            answer={phase.answer}
            engine={phase.engine}
            lang={lang}
            onClarify={answerClarifier}
            onStart={startService}
            persist={store.save}
          />
        )}
      </div>
    </div>
  );
}

function AnswerView({
  answer,
  engine,
  lang,
  onClarify,
  onStart,
  persist,
}: {
  answer: GroundedAnswer;
  engine: "model" | "fallback";
  lang: Lang;
  onClarify: (serviceId: string, answers: Answers, key: string, value: string) => void;
  onStart: (serviceId: string) => void;
  persist: ReturnType<typeof useJourneys>["save"];
}) {
  const { T } = useLocale();
  const narrow = "mx-auto max-w-3xl";

  switch (answer.kind) {
    case "journey": {
      const input: JourneyInput = answer.input;
      return (
        <div>
          {engine === "fallback" && false}
          <JourneyWorkspace
            key={`${input.serviceId}:${input.jurisdictionId}`}
            initialInput={input}
            externalInput={input}
            focus={answer.focus}
            persist={persist}
          />
        </div>
      );
    }
    case "clarify": {
      const service = getService(answer.serviceId);
      const clarifier = service?.clarifiers.find((c) => c.key === answer.clarifierKey);
      if (!service || !clarifier) return <NotVerifiedCard topic="other" />;
      return (
        <div className={`${narrow} space-y-4 rounded-3xl bg-surface p-6 ring-1 ring-line`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {T("oneQuickQuestion")}
          </p>
          <p className="text-sm text-muted">{pick(service.name, lang)}</p>
          <ClarifierChips
            clarifier={clarifier}
            onAnswer={(k, v) => onClarify(answer.serviceId, answer.answers, k, v)}
          />
        </div>
      );
    }
    case "unsupported": {
      const service = getService(answer.serviceId);
      const places = answer.supported.map((j) => pick(getJurisdiction(j)?.name, lang)).join(", ");
      return (
        <div className={`${narrow} space-y-4`}>
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-line">
            <p className="text-[11px] font-bold uppercase tracking-wider text-warning">
              {T("unsupportedTitle")}
            </p>
            <p className="mt-2 text-base font-bold text-ink">
              {service ? pick(service.name, lang) : ""}
            </p>
            <p className="mt-2 text-sm text-muted">{tf("unsupportedBody", lang, { places })}</p>
          </div>
          <NotVerifiedCard topic="other" sourceIds={answer.sourceIds} compact />
        </div>
      );
    }
    case "not_verified":
      return (
        <div className={`${narrow} space-y-4`}>
          <NotVerifiedCard topic={answer.topic} sourceIds={answer.sourceIds} />
          {answer.serviceId === null && <ServicePicker onStart={onStart} />}
        </div>
      );
    case "choose_service":
      return (
        <div className={`${narrow} space-y-4`}>
          <div>
            <p className="text-lg font-extrabold text-ink">{T("chooseServiceTitle")}</p>
            <p className="text-sm text-muted">{T("chooseServiceBody")}</p>
          </div>
          <ServicePicker onStart={onStart} />
        </div>
      );
    case "complaint":
      return (
        <div className={`${narrow} space-y-4 rounded-3xl bg-surface p-6 ring-1 ring-line`}>
          <p className="text-sm text-ink">{T("complaintRedirect")}</p>
          <Link
            to="/complaints"
            className="touch-target inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            {T("openCaseTracker")}
          </Link>
        </div>
      );
    case "off_topic":
      return (
        <div className={`${narrow} space-y-4`}>
          <p className="text-base font-semibold text-ink">{T("offTopic")}</p>
          <ServicePicker onStart={onStart} />
        </div>
      );
  }
}

function ServicePicker({ onStart }: { onStart: (serviceId: string) => void }) {
  const { lang } = useLocale();
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {listServices().map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onStart(s.id)}
            className="touch-target w-full rounded-2xl bg-surface p-4 text-start ring-1 ring-line transition-colors hover:bg-primary-tint"
          >
            <span className="block font-bold text-ink">{pick(s.name, lang)}</span>
            <span className="mt-0.5 block text-[13px] text-muted">{pick(s.summary, lang)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export type { JurisdictionId };
