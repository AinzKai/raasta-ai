import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/integrations/supabase/config";

/** Client-side session for UI chrome only — the server re-validates every request. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    // No Supabase settings: there can be no session. Never touch the client.
    if (!configured) return;
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      if (!active) return;
      setSession(current);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [configured]);

  return { session, loading, configured, user: session?.user ?? null };
}
