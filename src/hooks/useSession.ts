import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Client-side session for UI chrome only — the server re-validates every request. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  return { session, loading, user: session?.user ?? null };
}
