import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildJourney,
  type JourneyInput,
  type JourneyState,
  type SavedJourney,
} from "@/lib/journey";
import { KNOWLEDGE_VERSION, pick } from "@/lib/knowledge";
import { newId, readJourneys, removeLocal, upsertLocal } from "@/lib/journey/local-store";
import { fetchRemote, removeRemote, upsertRemote } from "@/lib/journey/remote-store";
import { useSession } from "@/hooks/useSession";

export type StoreStatus = "loading" | "ready" | "error";

/** Derive the saved record from the pure journey, so status never drifts from the checklist. */
export function toSaved(
  input: JourneyInput,
  state: JourneyState,
  prev?: SavedJourney,
): SavedJourney {
  const journey = buildJourney(input, state);
  const now = new Date().toISOString();
  const archived = prev?.status === "archived";
  const status = archived ? "archived" : journey.isComplete ? "completed" : "active";
  return {
    id: prev?.id ?? newId(),
    input,
    state,
    status,
    title: pick(journey.serviceName, "en"),
    knowledgeVersion: KNOWLEDGE_VERSION,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    completedAt: status === "completed" ? (prev?.completedAt ?? now) : null,
  };
}

/**
 * Journeys for the current visitor: this device for guests, their account when
 * signed in. Guests' journeys are imported into the account on sign-in.
 */
export function useJourneys() {
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user.id ?? null;
  const [journeys, setJourneys] = useState<SavedJourney[]>([]);
  const [status, setStatus] = useState<StoreStatus>("loading");
  const [imported, setImported] = useState(0);
  const importedFor = useRef<string | null>(null);

  const reload = useCallback(async () => {
    if (sessionLoading) return;
    setStatus("loading");
    try {
      if (userId) {
        if (importedFor.current !== userId) {
          importedFor.current = userId;
          const local = readJourneys(window.localStorage);
          if (local.length > 0) {
            await Promise.all(local.map((j) => upsertRemote(userId, j)));
            local.forEach((j) => removeLocal(window.localStorage, j.id));
            setImported(local.length);
          }
        }
        setJourneys(await fetchRemote());
      } else {
        setJourneys(readJourneys(window.localStorage));
      }
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [userId, sessionLoading]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (saved: SavedJourney): Promise<"saved-local" | "saved-account"> => {
      if (userId) {
        await upsertRemote(userId, saved);
        setJourneys((prev) => [saved, ...prev.filter((j) => j.id !== saved.id)]);
        return "saved-account";
      }
      if (!upsertLocal(window.localStorage, saved)) throw new Error("Local storage unavailable");
      setJourneys((prev) => [saved, ...prev.filter((j) => j.id !== saved.id)]);
      return "saved-local";
    },
    [userId],
  );

  const remove = useCallback(
    async (id: string) => {
      if (userId) await removeRemote(id);
      else removeLocal(window.localStorage, id);
      setJourneys((prev) => prev.filter((j) => j.id !== id));
    },
    [userId],
  );

  return {
    journeys,
    status,
    save,
    remove,
    reload,
    signedIn: !!userId,
    imported,
    ready: !sessionLoading,
  };
}
