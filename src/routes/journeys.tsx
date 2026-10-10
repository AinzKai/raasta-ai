import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useJourneys, toSaved } from "@/hooks/useJourneys";
import { buildJourney, type SavedJourney } from "@/lib/journey";
import { useLocale } from "@/lib/i18n";
import { pick } from "@/lib/knowledge";

export const Route = createFileRoute("/journeys")({
  head: () => ({ meta: [{ title: "My journeys — Raasta" }] }),
  component: MyJourneys,
});

function JourneyCard({
  saved,
  onArchive,
  onDelete,
}: {
  saved: SavedJourney;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { lang, T, tf } = useLocale();
  const journey = useMemo(() => {
    try {
      return buildJourney(saved.input, saved.state);
    } catch {
      return null;
    }
  }, [saved]);
  if (!journey) return null;
  const pct = Math.round(journey.progress * 100);

  return (
    <li className="rounded-3xl bg-surface p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {journey.agencyName} · {pick(journey.jurisdictionName, lang)}
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-ink">
            {pick(journey.serviceName, lang)}
          </h3>
        </div>
        <span className="text-sm font-semibold text-muted">
          {saved.status === "completed"
            ? T("journeyDone")
            : tf("stepsDone", { done: journey.completedCount, total: journey.totalSteps })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={tf("stepsDone", { done: journey.completedCount, total: journey.totalSteps })}
        className="mt-3 h-2 overflow-hidden rounded-full bg-primary-tint"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[13px] text-muted">
        {tf("readyPct", { pct: journey.readiness.percent })}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/journey/$id"
          params={{ id: saved.id }}
          className="touch-target inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          {T("continueJourney")}
        </Link>
        <button
          type="button"
          onClick={onArchive}
          className="touch-target inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted ring-1 ring-line hover:text-ink"
        >
          {saved.status === "archived" ? (
            <ArchiveRestore className="size-4" aria-hidden />
          ) : (
            <Archive className="size-4" aria-hidden />
          )}
          {saved.status === "archived" ? T("restartJourney") : T("archiveJourney")}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`${T("deleteJourney")}: ${pick(journey.serviceName, lang)}`}
          className="touch-target inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-warning ring-1 ring-line hover:bg-warning-tint"
        >
          <Trash2 className="size-4" aria-hidden />
          {T("deleteJourney")}
        </button>
      </div>
    </li>
  );
}

function Section({
  title,
  items,
  store,
}: {
  title: string;
  items: SavedJourney[];
  store: ReturnType<typeof useJourneys>;
}) {
  const { T } = useLocale();
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{title}</h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((j) => (
          <JourneyCard
            key={j.id}
            saved={j}
            onArchive={() =>
              void store.save({
                ...toSaved(j.input, j.state, j),
                status: j.status === "archived" ? "active" : "archived",
              })
            }
            onDelete={() => {
              if (window.confirm(T("deleteJourneyConfirm"))) void store.remove(j.id);
            }}
          />
        ))}
      </ul>
    </section>
  );
}

function MyJourneys() {
  const { T } = useLocale();
  const store = useJourneys();
  const [tick, setTick] = useState(0);
  const active = store.journeys.filter((j) => j.status === "active");
  const done = store.journeys.filter((j) => j.status === "completed");
  const archived = store.journeys.filter((j) => j.status === "archived");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6" key={tick}>
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{T("myJourneysTitle")}</h1>
        <p className="mt-1 text-muted">{T("myJourneysSub")}</p>
      </header>

      {store.imported > 0 && (
        <p
          role="status"
          className="rounded-2xl bg-primary-tint p-3 text-sm font-semibold text-primary"
        >
          {T("syncedNote")}
        </p>
      )}
      {!store.signedIn && store.ready && (
        <p className="rounded-2xl bg-source-tint p-3 text-sm text-ink ring-1 ring-source/25">
          {T("guestStorage")}{" "}
          <Link to="/auth" className="font-bold text-primary underline">
            {T("signIn")}
          </Link>
        </p>
      )}

      {store.status === "loading" && (
        <div role="status" className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-surface ring-1 ring-line" />
          ))}
          <span className="sr-only">{T("loading")}</span>
        </div>
      )}

      {store.status === "error" && (
        <div role="alert" className="rounded-3xl bg-surface p-6 ring-1 ring-line">
          <p className="font-bold text-ink">{T("errorTitle")}</p>
          <button
            type="button"
            onClick={() => {
              void store.reload();
              setTick((n) => n + 1);
            }}
            className="touch-target mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {T("tryAgain")}
          </button>
        </div>
      )}

      {store.status === "ready" && store.journeys.length === 0 && (
        <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-line">
          <p className="text-lg font-extrabold text-ink">{T("noJourneys")}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{T("noJourneysBody")}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              to="/chat"
              className="touch-target inline-flex items-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              {T("navStart")}
            </Link>
            <Link
              to="/demo"
              className="touch-target inline-flex items-center rounded-xl px-5 py-3 text-sm font-semibold text-ink ring-1 ring-line"
            >
              {T("seeExample")}
            </Link>
          </div>
        </div>
      )}

      {store.status === "ready" && (
        <>
          <Section title={T("activeJourneys")} items={active} store={store} />
          <Section title={T("completedJourneys")} items={done} store={store} />
          <Section title={T("archivedJourneys")} items={archived} store={store} />
        </>
      )}
    </div>
  );
}
