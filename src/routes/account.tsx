import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { useLocale } from "@/lib/i18n";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account — Raasta" }] }),
  component: Account,
});

function Account() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { T } = useLocale();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  async function deleteData() {
    if (!window.confirm(T("deleteMyDataConfirm"))) return;
    setBusy(true);
    // Row-level security scopes each delete to the signed-in user.
    const results = await Promise.all([
      supabase.from("journeys").delete().not("id", "is", null),
      supabase.from("conversations").delete().not("id", "is", null),
      supabase.from("complaints").delete().not("id", "is", null),
    ]);
    setBusy(false);
    if (results.some((r) => r.error)) toast.error(T("errorBody"));
    else toast.success(T("dataDeleted"));
  }

  async function deleteAccount() {
    if (!window.confirm(T("deleteAccountConfirm"))) return;
    setBusy(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      toast.success(T("dataDeleted"));
      void navigate({ to: "/" });
    } catch {
      toast.error(T("errorBody"));
      setBusy(false);
    }
  }

  if (loading || !session)
    return (
      <div role="status" className="mx-auto max-w-2xl px-4 py-10">
        <div className="h-40 animate-pulse rounded-3xl bg-surface ring-1 ring-line" />
        <span className="sr-only">{T("loading")}</span>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{T("accountTitle")}</h1>
        <p className="mt-1 text-muted">{session.user.email}</p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/journeys"
          className="touch-target inline-flex items-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          {T("navJourneys")}
        </Link>
        <Link
          to="/complaints"
          className="touch-target inline-flex items-center rounded-xl px-5 py-3 text-sm font-semibold ring-1 ring-line hover:bg-surface"
        >
          {T("navCases")}
        </Link>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut().then(() => navigate({ to: "/" }))}
          className="touch-target rounded-xl px-5 py-3 text-sm font-semibold text-muted ring-1 ring-line hover:text-ink"
        >
          Sign out
        </button>
      </div>

      <section
        aria-labelledby="privacy-title"
        className="space-y-4 rounded-3xl bg-surface p-6 ring-1 ring-line"
      >
        <h2 id="privacy-title" className="text-lg font-extrabold text-ink">
          {T("privacyTitle")}
        </h2>
        <p className="text-sm text-muted">{T("privacyRetention")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void deleteData()}
            className="touch-target rounded-xl px-4 py-2.5 text-sm font-semibold text-warning ring-1 ring-warning/30 hover:bg-warning-tint disabled:opacity-60"
          >
            {T("deleteMyData")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void deleteAccount()}
            className="touch-target rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {T("deleteAccount")}
          </button>
        </div>
      </section>
    </div>
  );
}
