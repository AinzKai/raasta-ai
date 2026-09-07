import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MessageSquareWarning } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { COMPLAINT_CATEGORIES, DEPARTMENTS, SERVICES } from "@/lib/knowledge";
import { Disclaimer } from "@/components/civic";

type Complaint = {
  id: string;
  reference: string;
  department: string;
  category: string;
  city: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
};

type Search = { service?: string };

export const Route = createFileRoute("/complaints")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    service: typeof search.service === "string" ? search.service : undefined,
  }),
  head: () => ({
    meta: [
      { title: "File and track a complaint — Raasta AI" },
      {
        name: "description",
        content:
          "Keep a dated record of delays, bribe demands and bad service at Pakistani government offices, and track what you did about it.",
      },
      { property: "og:title", content: "File and track a complaint — Raasta AI" },
      {
        property: "og:description",
        content: "A dated log you can take to the Citizen Portal or the department's complaint desk.",
      },
    ],
  }),
  component: Complaints,
});

const STATUSES = ["submitted", "acknowledged", "in progress", "resolved", "closed"];

function Complaints() {
  const { session, loading } = useSession();
  const search = Route.useSearch();
  const [items, setItems] = useState<Complaint[]>([]);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0]);
  const [serviceSlug, setServiceSlug] = useState(search.service ?? "");
  const [city, setCity] = useState("Islamabad");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!session) {
      setFetching(false);
      return;
    }
    let active = true;
    supabase
      .from("complaints")
      .select("id, reference, department, category, city, subject, description, status, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error("Could not load your complaints");
        setItems((data as Complaint[]) ?? []);
        setFetching(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("complaints")
        .insert({
          user_id: session.user.id,
          department,
          category,
          service_slug: serviceSlug || null,
          city,
          subject: subject.trim().slice(0, 160),
          description: description.trim().slice(0, 4000),
        })
        .select("id, reference, department, category, city, subject, description, status, created_at")
        .single();
      if (error) throw error;

      await supabase.from("complaint_events").insert({
        complaint_id: data.id,
        user_id: session.user.id,
        status: "submitted",
        note: "Recorded in Raasta",
      });

      setItems((prev) => [data as Complaint, ...prev]);
      setSubject("");
      setDescription("");
      toast.success(`Saved as ${data.reference}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your complaint");
    } finally {
      setBusy(false);
    }
  }

  async function advance(complaint: Complaint, status: string) {
    if (!session) return;
    const { error } = await supabase
      .from("complaints")
      .update({ status })
      .eq("id", complaint.id);
    if (error) {
      toast.error("Could not update that complaint");
      return;
    }
    await supabase.from("complaint_events").insert({
      complaint_id: complaint.id,
      user_id: session.user.id,
      status,
    });
    setItems((prev) => prev.map((c) => (c.id === complaint.id ? { ...c, status } : c)));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <span className="grid size-11 place-items-center rounded-2xl bg-primary-tint text-primary">
        <MessageSquareWarning className="size-5" />
      </span>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Complaints log</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Write down what happened while it is fresh: the office, the date, the person, the delay.
        Raasta keeps it dated and gives it a reference so you can quote it at the Citizen Portal or
        the department's own complaint desk.
      </p>

      <div className="mt-6">
        <Disclaimer>
          Raasta does not forward complaints to any department. This is your own record — file the
          official complaint at pmdu.gov.pk or with the department, then track it here.
        </Disclaimer>
      </div>

      {loading ? null : !session ? (
        <div className="mt-8 rounded-3xl bg-surface p-8 text-center ring-1 ring-line">
          <h2 className="text-lg font-bold">Sign in to keep your log</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Complaints are private to your account, so you need to be signed in to save one.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Sign in to continue
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="mt-8 rounded-3xl bg-surface p-6 ring-1 ring-line">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Department
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl bg-paper px-4 py-3 text-sm font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-primary"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                What happened
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl bg-paper px-4 py-3 text-sm font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-primary"
                >
                  {COMPLAINT_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Related service (optional)
                <select
                  value={serviceSlug}
                  onChange={(e) => setServiceSlug(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl bg-paper px-4 py-3 text-sm font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Not specific</option>
                  {SERVICES.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                City
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl bg-paper px-4 py-3 text-sm font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            </div>

            <label className="mt-3 block text-sm font-semibold">
              Subject
              <input
                required
                maxLength={160}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. CNIC token given but no counter service for 4 hours"
                className="mt-1.5 w-full rounded-2xl bg-paper px-4 py-3 text-sm font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="mt-3 block text-sm font-semibold">
              What happened, in detail
              <textarea
                required
                rows={5}
                maxLength={4000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Date, office, time you arrived, who you spoke to, what you were told."
                className="mt-1.5 w-full resize-y rounded-2xl bg-paper px-4 py-3 text-sm font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Save to my log
            </button>
          </form>

          <h2 className="mt-12 text-lg font-extrabold tracking-tight">Your complaints</h2>
          {fetching ? (
            <p className="mt-3 text-sm text-muted">Loading…</p>
          ) : !items.length ? (
            <p className="mt-3 text-sm text-muted">Nothing logged yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-3xl bg-surface p-5 ring-1 ring-line">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary-tint px-2.5 py-1 text-[11px] font-bold text-primary">
                      {item.reference}
                    </span>
                    <span className="text-xs text-muted">{item.department}</span>
                    <span className="text-xs text-muted">· {item.city}</span>
                    <span className="ml-auto text-xs text-muted">
                      {new Date(item.created_at).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h3 className="mt-2 text-[15px] font-bold">{item.subject}</h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {item.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        onClick={() => void advance(item, status)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-bold capitalize ring-1 transition-colors ${
                          item.status === status
                            ? "bg-primary text-primary-foreground ring-primary"
                            : "bg-paper text-muted ring-line hover:text-primary"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
