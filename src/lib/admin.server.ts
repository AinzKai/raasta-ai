import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/freshness/governance";
import { knowledgeStore } from "@/lib/knowledge-store.server";

/**
 * Admin gate for server functions. The user id comes from the verified JWT;
 * admin status is looked up in the database on EVERY call. There is no client
 * flag, header, query parameter or storage value that can grant access.
 */
export const requireKnowledgeAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const adminId = await assertAdmin(knowledgeStore, context.userId);
    return next({ context: { adminId } });
  });
