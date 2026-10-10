import { createServerFn } from "@tanstack/react-start";
import type { PublishedVersion } from "@/lib/freshness/types";

/**
 * The public overlay: approved, published knowledge versions only. Pending,
 * rejected and rolled-back data can never appear here (the query selects
 * status = 'published'). If the lookup fails we return nothing, so users get
 * the seeded values — never a guess.
 */
export const getPublishedKnowledge = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublishedVersion[]> => {
    try {
      const { knowledgeStore } = await import("@/lib/knowledge-store.server");
      return await knowledgeStore.publishedVersions();
    } catch (e) {
      console.error("published_knowledge_unavailable", e instanceof Error ? e.message : e);
      return [];
    }
  },
);
