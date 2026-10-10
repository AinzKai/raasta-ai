import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useLocale } from "@/lib/i18n";
import { COMPLAINT_CATEGORIES, DEPARTMENTS, getSource, listServices, pick } from "@/lib/knowledge";
import type { CopyKey } from "@/lib/copy";

export const Route = createFileRoute("/complaints")({
  head: () => ({
    meta: [
      { title: "Raasta Case Tracker" },
      {
        name: "description",
        content:
          "Keep your own record of a problem with a government service. Not connected to any government system.",
      },
    ],
  }),
  component: CaseTracker,
});

const STATUSES: Array<{ value: string; key: CopyKey }> = [
  { value: "recorded", key: "csRecorded" },
  { value: "follow_up_needed", key: "csFollowUp" },
  { value: "waiting_for_response", key: "csWaiting" },
  { value: "escalated", key: "csEscalated" },
  { value: "resolved", key: "csResolved" },
  { value: "closed", key: "csClosed" },
];

/** Official portals Raasta can link to. Only sites already in the verified source registry. */
const OFFICIAL_SITE: Record<string, string> = {
  NADRA: "nadra.site",
  "DGI&P (Passports)": "dgip.faq",
  "Excise & Taxation": "ict-excise.site",
  FBR: "fbr.site",
  Police: "ict-police.site",
};

type Case = {
  id: string;
  reference: string;
  department: string;
  category: string;
  city: string;
  subject: string;
  description: string;
  personal_status: string;
  official_reference: string | null;
  created_at: string;
};
type CaseEvent = {
  id: string;
  complaint_id: string;
  status: string;
  note: string | null;
  created_at: string;
};

function CaseTracker() {
  const { session, loading } = useSession();
  const { lang, T } = useLocale();
  const [cases, setCases] = useState<Case[]>([]);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    department: DEPARTMENTS[0]!,
    category: COMPLAINT_CATEGORIES[0]!,
    city: "Islamabad",
    service: "",
    official: "",
  });

  const load = useCallback(async () => {
    setFetching(true);
    setLoadError(false);
    const [c, e] = await Promise.all([
      supabase
        .from("complaints")
        .select(
          "id, reference, department, category, city, subject, description, personal_status, official_reference, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("complaint_events")
        .select("id, complaint_id, status, note, created_at")
        .order("created_at", { ascending: true })
        .limit(500),
    ]);
    if (c.error || e.error) setLoadError(true);
    else {
      setCases(c.data ?? []);
      setEvents(e.data ?? []);
    }
    setFetching(false);
  }, []);

  useEffect(() => {
    if (session) void load();
    else if (!loading) setFetching(false);
  }, [session, loading, load]);

  const statusLabel = (v: string) => T(STATUSES.find((s) => s.value === v)?.key ?? "csRecorded");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("complaints")
      .insert({
        user_id: session.user.id,
        subject: form.subject.trim(),
        description: form.description.trim(),
        department: form.department,
        category: form.category,
        city: form.city.trim() || "Islamabad",
        service_slug: form.service || null,
        personal_status: "recorded",
        official_reference: form.official.trim() || null,
      })
      .select("id")
      .single();
    if (error || !data) {
      setBusy(false);
      toast.error(T("errorBody"));
      return;
    }
    await supabase
      .from("complaint_events")
      .insert({ complaint_id: data.id, user_id: session.user.id, status: "recorded", note: null });
    setForm((f) => ({ ...f, subject: "", description: "", official: "" }));
    toast.success(T("caseSaved"));
    setBusy(false);
    void load();
  }

  async function setStatus(c: Case, next: string) {
    if (!session) return;
    const { error } = await supabase
      .from("complaints")
      .update({ personal_status: next })
      .eq("id", c.id);
    if (error) return void toast.error(T("errorBody"));
    await supabase
      .from("complaint_events")
      .insert({ complaint_id: c.id, user_id: session.user.id, status: next, note: null });
    void load();
  }

  async function addNote(c: Case, note: string) {
    if (!session || !note.trim()) return;
    const { error } = await supabase.from("complaint_events").insert({
      complaint_id: c.id,
      user_id: session.user.id,
      status: c.personal_status,
      note: note.trim().slice(0, 1000),
    });
    if (error) return void toast.error(T("errorBody"));
    void load();
  }

  async function saveReference(c: Case, ref: string) {
    const { error } = await supabase
      .from("complaints")
      .update({ official_reference: ref.trim() || null })
      .eq("id", c.id);
    if (error) toast.error(T("errorBody"));
    else void load();
  }

  const field =
    "mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-base text-ink focus-visible:outline-primary";

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{T("caseTitle")}</h1>
        <p className="mt-1 text-muted">{T("caseSub")}</p>
        <p className="mt-3 rounded-2xl bg-source-tint p-3 text-sm font-semibold text-ink ring-1 ring-source/30">
          {T("caseDisclaimer")}
        </p>
      </header>

      {!loading && !session && (
        <div className="rounded-3xl bg-surface p-6 ring-1 ring-line">
          <p className="text-ink">{T("caseSignIn")}</p>
          <Link
            to="/auth"
            className="touch-target mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            {T("signIn")}
          </Link>
        </div>
      )}

      {session && (
        <form onSubmit={create} className="space-y-4 rounded-3xl bg-surface p-5 ring-1 ring-line">
          <h2 className="text-lg font-extrabold text-ink">{T("newCase")}</h2>
          <label className="block text-sm font-bold text-ink">
            {T("caseSubject")}
            <input
              required
              minLength={3}
              maxLength={160}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className={field}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-ink">
              {T("caseDepartment")}
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className={field}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold text-ink">
              {T("caseCategory")}
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={field}
              >
                {COMPLAINT_CATEGORIES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold text-ink">
              {T("caseCity")}
              <input
                maxLength={80}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={field}
              />
            </label>
            <label className="block text-sm font-bold text-ink">
              {T("navServices")}
              <select
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                className={field}
              >
                <option value="">—</option>
                {listServices().map((s) => (
                  <option key={s.id} value={s.id}>
                    {pick(s.name, lang)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-bold text-ink">
            {T("caseDetails")}
            <textarea
              required
              minLength={10}
              maxLength={4000}
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={field}
            />
          </label>
          <label className="block text-sm font-bold text-ink">
            {T("officialRef")}
            <input
              maxLength={120}
              value={form.official}
              onChange={(e) => setForm({ ...form, official: e.target.value })}
              className={field}
            />
            <span className="mt-1 block text-[12px] font-normal text-muted">
              {T("officialRefHint")}
            </span>
          </label>
          <button
            disabled={busy}
            className="touch-target inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {T("caseSave")}
          </button>
        </form>
      )}

      {session && fetching && (
        <div role="status" className="h-24 animate-pulse rounded-3xl bg-surface ring-1 ring-line">
          <span className="sr-only">{T("loading")}</span>
        </div>
      )}
      {session && loadError && (
        <div role="alert" className="rounded-3xl bg-surface p-5 ring-1 ring-line">
          <p className="font-bold text-ink">{T("errorTitle")}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="touch-target mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {T("tryAgain")}
          </button>
        </div>
      )}
      {session && !fetching && !loadError && cases.length === 0 && (
        <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-line">
          <p className="font-extrabold text-ink">{T("caseEmpty")}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{T("caseEmptyBody")}</p>
        </div>
      )}

      <ul className="space-y-5">
        {cases.map((c) => {
          const portal = getSource(OFFICIAL_SITE[c.department]);
          const timeline = events.filter((e) => e.complaint_id === c.id);
          return (
            <li key={c.id} className="space-y-4 rounded-3xl bg-surface p-5 ring-1 ring-line">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {c.department} · {c.category} · {c.city}
                </p>
                <h3 className="mt-1 text-lg font-extrabold text-ink">{c.subject}</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-muted">{c.description}</p>
                <p className="mt-1 text-[12px] text-muted">
                  Raasta record {c.reference} ·{" "}
                  {new Date(c.created_at).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-GB")}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-primary-tint/60 p-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-primary">
                    {T("raastaStatus")}
                    <select
                      value={c.personal_status}
                      onChange={(e) => void setStatus(c, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm font-semibold normal-case tracking-normal text-ink"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {T(s.key)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="rounded-2xl bg-paper p-3 ring-1 ring-line">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    {T("officialStatus")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">{T("notConnected")}</p>
                </div>
              </div>
              <label className="block text-sm font-bold text-ink">
                {T("officialRef")}
                <input
                  defaultValue={c.official_reference ?? ""}
                  maxLength={120}
                  onBlur={(e) => {
                    if (e.target.value !== (c.official_reference ?? ""))
                      void saveReference(c, e.target.value);
                  }}
                  className={field}
                />
              </label>
              {portal && (
                <a
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-target inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {T("caseOpenPortal")} · {portal.title.split(" — ")[0]}{" "}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
              <div>
                <h4 className="text-sm font-bold text-ink">{T("caseTimeline")}</h4>
                <ol className="mt-2 space-y-1.5 border-s-2 border-line ps-3 text-sm">
                  {timeline.map((ev) => (
                    <li key={ev.id}>
                      <span className="font-semibold text-ink">{statusLabel(ev.status)}</span>{" "}
                      <span className="text-[12px] text-muted">
                        ·{" "}
                        {new Date(ev.created_at).toLocaleString(lang === "ur" ? "ur-PK" : "en-GB")}
                      </span>
                      {ev.note && <span className="block text-muted">{ev.note}</span>}
                    </li>
                  ))}
                </ol>
                <NoteBox label={T("caseAddNote")} onAdd={(n) => void addNote(c, n)} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NoteBox({ label, onAdd }: { label: string; onAdd: (note: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(v);
        setV("");
      }}
    >
      <input
        aria-label={label}
        value={v}
        onChange={(e) => setV(e.target.value)}
        maxLength={1000}
        placeholder={label}
        className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus-visible:outline-primary"
      />
      <button className="touch-target rounded-xl px-4 py-2 text-sm font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary-tint">
        {label}
      </button>
    </form>
  );
}
