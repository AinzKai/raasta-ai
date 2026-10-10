import { createFileRoute, Link } from "@tanstack/react-router";

import { JourneyWorkspace } from "@/components/journey/JourneyWorkspace";
import { useJourneys } from "@/hooks/useJourneys";
import { useLocale } from "@/lib/i18n";

export const Route = createFileRoute("/journey/$id")({
  head: () => ({ meta: [{ title: "Your journey — Raasta" }] }),
  component: SavedJourneyPage,
});

function SavedJourneyPage() {
  const { id } = Route.useParams();
  const { T } = useLocale();
  const store = useJourneys();
  const saved = store.journeys.find((j) => j.id === id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        to="/journeys"
        className="touch-target mb-4 inline-flex items-center text-sm font-semibold text-primary"
      >
        ← {T("navJourneys")}
      </Link>
      {store.status === "loading" && (
        <div role="status" className="h-64 animate-pulse rounded-3xl bg-surface ring-1 ring-line">
          <span className="sr-only">{T("loading")}</span>
        </div>
      )}
      {store.status === "error" && (
        <div role="alert" className="rounded-3xl bg-surface p-6 ring-1 ring-line">
          <p className="font-bold text-ink">{T("errorTitle")}</p>
          <button
            type="button"
            onClick={() => void store.reload()}
            className="touch-target mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {T("tryAgain")}
          </button>
        </div>
      )}
      {store.status === "ready" && !saved && (
        <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-line">
          <p className="text-lg font-extrabold text-ink">{T("noJourneys")}</p>
          <Link
            to="/chat"
            className="touch-target mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            {T("navStart")}
          </Link>
        </div>
      )}
      {saved && (
        <JourneyWorkspace
          key={saved.id}
          initialInput={saved.input}
          initialState={saved.state}
          saved={saved}
          persist={store.save}
        />
      )}
    </div>
  );
}
