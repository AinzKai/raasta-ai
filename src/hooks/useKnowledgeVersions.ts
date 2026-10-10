import { useEffect, useState } from "react";

import { getPublishedKnowledge } from "@/lib/knowledge.functions";
import type { PublishedVersion } from "@/lib/freshness/types";

let cache: { at: number; versions: PublishedVersion[] } | null = null;
const TTL_MS = 5 * 60_000;

/**
 * Approved knowledge versions layered over the built-in seed. If the lookup
 * fails (offline, server error) this is simply empty, so users see the seeded
 * values rather than anything unapproved.
 */
export function useKnowledgeVersions(): PublishedVersion[] {
  const [versions, setVersions] = useState<PublishedVersion[]>(cache?.versions ?? []);
  useEffect(() => {
    if (cache && Date.now() - cache.at < TTL_MS) return;
    let live = true;
    getPublishedKnowledge()
      .then((v) => {
        cache = { at: Date.now(), versions: v };
        if (live) setVersions(v);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return versions;
}
