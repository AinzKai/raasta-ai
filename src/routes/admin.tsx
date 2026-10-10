import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useSession } from "@/hooks/useSession";
import { getAdminAccess } from "@/lib/knowledge-admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Knowledge admin — Raasta" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

type Access = "checking" | "signed-out" | "forbidden" | "admin" | "error";

/**
 * This gate only decides what to RENDER. It grants nothing: every admin server
 * function re-verifies the caller's identity and admin status in the database.
 */
function AdminLayout() {
  const { session, loading } = useSession();
  const [access, setAccess] = useState<Access>("checking");

  useEffect(() => {
    if (loading) return;
    if (!session) return setAccess("signed-out");
    let live = true;
    getAdminAccess()
      .then((r) => live && setAccess(r.isAdmin ? "admin" : "forbidden"))
      .catch(() => live && setAccess("error"));
    return () => {
      live = false;
    };
  }, [session, loading]);

  if (access === "checking")
    return (
      <div role="status" className="mx-auto max-w-4xl p-8 text-muted">
        Checking access…
      </div>
    );
  if (access === "signed-out")
    return (
      <div className="mx-auto max-w-md space-y-3 p-8">
        <h1 className="text-xl font-extrabold text-ink">Sign in required</h1>
        <p className="text-muted">Sign in to continue.</p>
        <Link
          to="/auth"
          className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  if (access === "forbidden")
    return (
      <div className="mx-auto max-w-md space-y-3 p-8">
        <h1 className="text-xl font-extrabold text-ink">Not authorized</h1>
        <p className="text-muted">This area is restricted.</p>
        <Link to="/" className="text-sm font-semibold text-primary underline">
          Back to Raasta
        </Link>
      </div>
    );
  if (access === "error")
    return (
      <div role="alert" className="mx-auto max-w-md p-8 text-warning">
        Could not verify access. Try again later.
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav
        aria-label="Admin"
        className="mb-6 flex flex-wrap items-center gap-4 border-b border-line pb-3 text-sm font-semibold"
      >
        <span className="rounded-md bg-ink px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground">
          Admin
        </span>
        <Link
          to="/admin"
          activeOptions={{ exact: true }}
          className="text-muted hover:text-ink"
          activeProps={{ className: "text-primary" }}
        >
          Dashboard &amp; review queue
        </Link>
        <Link
          to="/admin/history"
          className="text-muted hover:text-ink"
          activeProps={{ className: "text-primary" }}
        >
          Versions &amp; audit
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}
