import { z } from "zod";
import { JourneyInputSchema, JourneyStateSchema } from "./schema";
import type { SavedJourney } from "./types";

/**
 * Local-first journey storage. Works offline, for guests, and for the demo.
 * Everything read back is re-validated: stored data is never trusted.
 */

export const LOCAL_KEY = "raasta.journeys.v1";
export const DEMO_KEY = "raasta.demo.v1";

const SavedSchema = z.object({
  id: z.string().min(1).max(80),
  input: JourneyInputSchema,
  state: JourneyStateSchema,
  status: z.enum(["active", "completed", "archived"]),
  title: z.string().max(200),
  knowledgeVersion: z.string().max(40),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readJourneys(storage: StorageLike, key = LOCAL_KEY): SavedJourney[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = z.array(SavedSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function writeJourneys(
  storage: StorageLike,
  journeys: SavedJourney[],
  key = LOCAL_KEY,
): boolean {
  try {
    storage.setItem(key, JSON.stringify(journeys));
    return true;
  } catch {
    return false; // storage full or blocked (private mode)
  }
}

export function upsertLocal(storage: StorageLike, saved: SavedJourney, key = LOCAL_KEY): boolean {
  const all = readJourneys(storage, key).filter((j) => j.id !== saved.id);
  return writeJourneys(storage, [saved, ...all], key);
}

export function removeLocal(storage: StorageLike, id: string, key = LOCAL_KEY): boolean {
  return writeJourneys(
    storage,
    readJourneys(storage, key).filter((j) => j.id !== id),
    key,
  );
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
