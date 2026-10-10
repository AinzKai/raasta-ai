import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { confidenceLabel } from "@/lib/freshness/extract";
import { getCandidateDetail, reviewCandidate } from "@/lib/knowledge-admin.functions";

export const Route = createFileRoute("/admin/candidates/$id")({ component: Review });

type Detail = Awaited<ReturnType<typeof getCandidateDetail>>;
const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " UTC"
    : "—";
const pkr = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `PKR ${n.toLocaleString("en-US")}`;

function Review() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [effective, setEffective] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCandidateDetail({ data: { id } })
      .then(setD)
      .catch(() => setError("Could not load this candidate."));
  }, [id]);

  async function act(action: "approve" | "reject" | "investigate") {
    setBusy(true);
    try {
      const r = await reviewCandidate({
        data: {
          id,
          action,
          note: note || undefined,
          effectiveFrom:
            action === "approve" && effective
              ? new Date(`${effective}T00:00:00Z`).toISOString()
              : null,
        },
      });
      toast.success(
        action === "approve"
          ? r.scheduled
            ? `Version ${r.version} approved and scheduled`
            : `Version ${r.version} published`
          : action === "reject"
            ? "Rejected"
            : "Flagged for investigation",
      );
      void navigate({ to: "/admin" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
      setBusy(false);
    }
  }

  if (error)
    return (
      <div role="alert" className="text-warning">
        {error}
      </div>
    );
  if (!d)
    return (
      <div role="status" className="text-muted">
        Loading…
      </div>
    );
  const c = d.candidate;
  const open = c.status === "pending" || c.status === "needs-investigation";
  const complete = c.kind === "value_change";

  return (
    <div className="space-y-6">
      <Link to="/admin" className="text-sm font-semibold text-primary">
        ← Review queue
      </Link>
      <header>
        <h1 className="text-2xl font-extrabold text-ink">
          {d.entity?.label ?? "Source page changed"}
        </h1>
        <p className="text-sm text-muted">
          {d.entity
            ? `${d.entity.serviceId} · ${d.entity.jurisdictionId}`
            : "No monitored fact is linked to this change"}{" "}
          · Status <b className="text-ink">{d.displayStatus}</b> · Detected {fmt(c.detectedAt)} ·
          Confidence {confidenceLabel(c.confidence)}
          {c.extraction === "fixture" && (
            <b className="ms-2 rounded bg-source-tint px-1.5 py-0.5 text-ink">
              DEV FIXTURE — simulated, not a real source change
            </b>
          )}
        </p>
      </header>

      {complete && (
        <div className="grid gap-4 md:grid-cols-2">
          <section aria-labelledby="cur" className="rounded-2xl bg-surface p-5 ring-1 ring-line">
            <h2 id="cur" className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Current trusted value
            </h2>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink">
              {pkr(d.currentTrusted?.value)}
            </p>
            <p className="text-[12px] text-muted">
              Version {d.currentTrusted?.version} (
              {d.currentTrusted?.source === "seed" ? "seeded baseline" : "published"})
            </p>
          </section>
          <section
            aria-labelledby="prop"
            className="rounded-2xl bg-primary-tint p-5 ring-1 ring-primary/20"
          >
            <h2 id="prop" className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Proposed value
            </h2>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink">
              {pkr(c.proposedValue)}
            </p>
            <p className="text-[12px] text-muted">Proposal only — not active until approved</p>
          </section>
        </div>
      )}

      <section
        aria-labelledby="src"
        className="space-y-2 rounded-2xl bg-surface p-5 ring-1 ring-line"
      >
        <h2 id="src" className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Source &amp; evidence
        </h2>
        <p className="font-semibold text-ink">{d.source?.title ?? c.sourceId}</p>
        {d.source && (
          <a
            href={d.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Open official source <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
        {c.sourceEvidence.quote ? (
          <blockquote className="rounded-lg border-s-4 border-primary bg-paper p-3 text-sm text-ink">
            {c.sourceEvidence.quote}
            <footer className="mt-1 text-[11px] text-muted">
              Excerpt of the normalized page text at detection time
              {c.extraction === "ai"
                ? " — extracted by AI and verified to appear verbatim on the page"
                : ""}
              .
            </footer>
          </blockquote>
        ) : (
          <p className="text-sm text-muted">
            No excerpt was extracted. Open the source and compare.
          </p>
        )}
        <p className="text-[13px] text-muted">
          Figures added to the page: {c.sourceEvidence.addedFacts.join(", ") || "none"} · figures
          removed: {c.sourceEvidence.removedFacts.join(", ") || "none"}
        </p>
        {c.effectiveFrom && (
          <p className="text-[13px] text-ink">
            Effective date found by extraction: {fmt(c.effectiveFrom)} — confirm it on the source.
          </p>
        )}
      </section>

      {d.history.length > 0 && (
        <section aria-labelledby="hist" className="rounded-2xl bg-surface p-5 ring-1 ring-line">
          <h2 id="hist" className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Version history
          </h2>
          <ul className="mt-2 text-sm">
            {d.history.map((h) => (
              <li key={h.version}>
                v{h.version}: {pkr(h.value)} — {h.status}
                {h.from ? ` (from ${fmt(h.from)})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {open ? (
        <section
          aria-labelledby="act"
          className="space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-line"
        >
          <h2 id="act" className="text-lg font-extrabold text-ink">
            Decision
          </h2>
          <label className="block text-sm font-semibold text-ink">
            Reviewer note
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="e.g. Confirmed against the current official NADRA fee structure."
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            />
          </label>
          {complete && (
            <label className="block text-sm font-semibold text-ink">
              Effective from (leave empty if the source gives no date)
              <input
                type="date"
                value={effective}
                onChange={(e) => setEffective(e.target.value)}
                className="mt-1 block rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-[12px] font-normal text-muted">
                Empty = active from the moment you approve (recorded in the audit log). A future
                date schedules the change; users keep the current value until then.
              </span>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy || !complete}
              onClick={() => void act("approve")}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
            >
              Approve change
            </button>
            <button
              disabled={busy}
              onClick={() => void act("reject")}
              className="rounded-xl bg-warning px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              Reject change
            </button>
            {c.status === "pending" && (
              <button
                disabled={busy}
                onClick={() => void act("investigate")}
                className="rounded-xl px-5 py-2.5 text-sm font-bold ring-1 ring-line hover:bg-paper disabled:opacity-40"
              >
                Needs more investigation
              </button>
            )}
          </div>
          {!complete && (
            <p className="text-[12px] text-muted">
              This is a page-level change with no validated value, so it can only be rejected or
              investigated. Update the knowledge manually if a fact changed.
            </p>
          )}
        </section>
      ) : (
        <p className="rounded-2xl bg-surface p-4 text-sm text-muted ring-1 ring-line">
          Reviewed {fmt(c.reviewedAt)}
          {c.reviewNote ? ` — “${c.reviewNote}”` : ""}
        </p>
      )}
    </div>
  );
}
