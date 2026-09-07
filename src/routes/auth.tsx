import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { RaastaMark } from "@/components/RaastaLogo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Raasta AI" },
      {
        name: "description",
        content: "Sign in to save your roadmaps, track complaints and pick up where you left off.",
      },
      { property: "og:title", content: "Sign in — Raasta AI" },
      { property: "og:description", content: "Save your civic-service roadmaps and complaints." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/account", replace: true });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/account" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign you in");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      setBusy(false);
      toast.error("Google sign-in didn't work. Try email instead.");
      return;
    }
    // On success, Supabase redirects the browser to Google, then back to
    // redirectTo — this function's job is done; no further navigation here.
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <span className="grid size-14 place-items-center self-center rounded-2xl bg-primary-tint">
        <RaastaMark className="size-9" />
      </span>
      <h1 className="mt-5 text-center text-2xl font-extrabold tracking-tight">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-center text-sm text-muted">
        Save your roadmaps and keep a dated record of every complaint you file.
      </p>

      {sent ? (
        <div className="mt-8 rounded-3xl bg-surface p-6 text-center ring-1 ring-line">
          <p className="text-sm leading-relaxed">
            Check <span className="font-bold">{email}</span> for a confirmation link. Once you
            confirm, come back and sign in.
          </p>
        </div>
      ) : (
        <>
          <button
            onClick={() => void google()}
            disabled={busy}
            className="mt-8 flex items-center justify-center gap-3 rounded-2xl bg-surface px-5 py-3.5 text-sm font-bold ring-1 ring-line transition-shadow hover:shadow-lift disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4h6.6c-.1 1.1-.9 2.8-2.5 3.9l3.8 3c2.3-2.1 3.6-5.2 3.6-8.7Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-2.9l-3.8-3c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5l-3.9 3A12 12 0 0 0 12 24Z"
              />
              <path fill="#FBBC05" d="M5.1 14.3a7.4 7.4 0 0 1 0-4.6l-3.9-3a12 12 0 0 0 0 10.6l3.9-3Z" />
              <path
                fill="#EA4335"
                d="M12 4.8c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.2 6.7l3.9 3c1-2.9 3.7-4.9 6.9-4.9Z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-line" />
            or use email
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-2xl bg-surface px-4 py-3.5 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-primary"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="rounded-2xl bg-surface px-4 py-3.5 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="rounded-2xl bg-surface px-4 py-3.5 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 text-center text-sm text-muted"
          >
            {mode === "signin" ? (
              <>
                New here? <span className="font-bold text-primary">Create an account</span>
              </>
            ) : (
              <>
                Already registered? <span className="font-bold text-primary">Sign in</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
