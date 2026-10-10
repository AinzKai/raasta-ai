import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Permanently deletes the signed-in user's account. The user id comes from the
 * verified JWT (never from the request body). Journeys, conversations, cases
 * and their events are removed by ON DELETE CASCADE.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error("Could not delete the account. Please try again.");
    return { ok: true as const };
  });
