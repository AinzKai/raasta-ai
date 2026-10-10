import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { parseInput, parseState } from "./schema";
import type { SavedJourney } from "./types";

type Row = {
  id: string;
  service_id: string;
  jurisdiction_id: string;
  title: string;
  answers: Json;
  state: Json;
  status: string;
  knowledge_version: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

function fromRow(row: Row): SavedJourney | null {
  const input = parseInput({
    serviceId: row.service_id,
    jurisdictionId: row.jurisdiction_id,
    answers: row.answers,
  });
  if (!input) return null;
  return {
    id: row.id,
    input,
    state: parseState(row.state),
    status: row.status === "completed" || row.status === "archived" ? row.status : "active",
    title: row.title,
    knowledgeVersion: row.knowledge_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

/** Row-level security guarantees these queries only ever see the signed-in user's rows. */
export async function fetchRemote(): Promise<SavedJourney[]> {
  const { data, error } = await supabase
    .from("journeys")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromRow(r as Row)).filter((j): j is SavedJourney => j !== null);
}

export async function upsertRemote(userId: string, saved: SavedJourney): Promise<void> {
  const { error } = await supabase.from("journeys").upsert({
    id: saved.id,
    user_id: userId,
    service_id: saved.input.serviceId,
    jurisdiction_id: saved.input.jurisdictionId,
    title: saved.title,
    answers: saved.input.answers as Json,
    state: saved.state as unknown as Json,
    status: saved.status,
    knowledge_version: saved.knowledgeVersion,
    completed_at: saved.completedAt,
  });
  if (error) throw new Error(error.message);
}

export async function removeRemote(id: string): Promise<void> {
  const { error } = await supabase.from("journeys").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
