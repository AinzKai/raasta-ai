import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { confidenceLabel } from "@/lib/freshness/extract";
import {
  createFixtureCandidate,
  getKnowledgeDashboard,
  resolveConflictFn,
  runMonitorNow,
} from "@/lib/knowledge-admin.functions";
import { FEES, getService, pick } from "@/lib/knowledge";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

type Data = Awaited<ReturnType<typeof getKnowledgeDashboard>>;

const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " UTC"
    : "—";
const label = (id: string | null) =>
  FEES.find((f) => f.id === id)?.label.en ?? id ?? "Source page changed";

function Stat({ n, children, tone }: { n: number; children: string; tone?: "warn" }) {
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <p
        className={`text-2xl font-extrabold tabular-nums ${tone === "warn" && n > 0 ? "text-warning" : "text-ink"}`}
      >
        {n}
      </p>
      <p className="text-[12px] font-semibold text-muted">{children}</p>
    </div>
  );
}

function AdminHome() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setData(await getKnowledgeDashboard());
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => void load(), [load]);

  async function run(force: boolean) {
    setBusy(true);
    try {
      const s = await runMonitorNow({ data: { force } });
      toast.success(
        `Monitor finished: ${s.checked} checked, ${s.changed} changed, ${s.candidatesCreated} candidates`,
      );
      await load();
    } catch {
      toast.error("Monitor run failed");
    }
    setBusy(false);
  }

  if (error)
    return (
      <div role="alert" className="text-warning">
        Could not load the dashboard.{" "}
        <button className="underline" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  if (!data)
    return (
      <div role="status" className="text-muted">
        Loading…
      </div>
    );
  const { dashboard: d, pending, recent, conflicts } = data;

  return (
    <div className="space-y-8">
      <section aria-labelledby="health">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 id="health" className="text-2xl font-extrabold text-ink">
            Knowledge health
          </h1>
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => void run(false)}
              className="rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 ring-line hover:bg-surface disabled:opacity-50"
            >
              Run monitor (due sources)
            </button>
            <button
              disabled={busy}
              onClick={() => void run(true)}
              className="rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 ring-line hover:bg-surface disabled:opacity-50"
            >
              Force check all
            </button>
            {data.fixtures && (
              <button
                disabled={busy}
                onClick={() =>
                  void createFixtureCandidate()
                    .then(load)
                    .catch(() => toast.error("Fixture failed"))
                }
                className="rounded-xl bg-source-tint px-3.5 py-2 text-sm font-semibold ring-1 ring-source/40"
              >
                DEV fixture: CNIC 400 → 600
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <Stat n={d.counts.monitored}>Sources registered</Stat>
          <Stat n={d.counts.healthy}>Healthy</Stat>
          <Stat n={d.counts.changesDetected}>Changed (7 days)</Stat>
          <Stat n={d.counts.pendingReviews} tone="warn">
            Pending reviews
          </Stat>
          <Stat n={d.counts.stale} tone="warn">
            Stale
          </Stat>
          <Stat n={d.counts.unreachable} tone="warn">
            Unreachable
          </Stat>
          <Stat n={d.counts.manual}>Manual only</Stat>
          <Stat n={d.counts.neverChecked}>Never checked</Stat>
        </div>
        <p className="mt-3 text-sm text-muted">
          Last monitoring run: <b className="text-ink">{fmt(d.lastRun?.at)}</b> (
          {d.lastRun?.status ?? "none"}) · Last successful run:{" "}
          <b className="text-ink">{fmt(d.lastSuccessfulRun?.at)}</b>
        </p>
        <p className="mt-1 text-[12px] text-muted">
          “Healthy” means reachable and recently read. It does not mean the knowledge has been
          verified.
        </p>
      </section>

      <section aria-labelledby="queue">
        <h2 id="queue" className="text-lg font-extrabold text-ink">
          Pending knowledge changes ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="mt-2 text-sm text-muted">Nothing waiting for review.</p>
        )}
        <ul className="mt-3 space-y-3">
          {pending.map((c) => {
            const svc = c.serviceId ? getService(c.serviceId) : null;
            return (
              <li key={c.id} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      {svc ? pick(svc.name, "en") : "Source change"} · {c.jurisdictionId ?? "—"} ·{" "}
                      {c.status}
                      {c.extraction === "fixture" && (
                        <span className="ms-2 rounded bg-source-tint px-1.5 py-0.5 text-ink">
                          DEV FIXTURE
                        </span>
                      )}
                    </p>
                    <p className="mt-1 font-bold text-ink">{label(c.entityId)}</p>
                    {c.kind === "value_change" ? (
                      <p className="mt-1 text-lg font-extrabold tabular-nums text-ink">
                        PKR {c.oldValue?.toLocaleString("en-US")} → PKR{" "}
                        {c.proposedValue?.toLocaleString("en-US")}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted">
                        Page content changed; no validated value proposal. Added figures:{" "}
                        {c.sourceEvidence.addedFacts.slice(0, 8).join(", ") || "none"} · Removed:{" "}
                        {c.sourceEvidence.removedFacts.slice(0, 8).join(", ") || "none"}
                      </p>
                    )}
                    <p className="mt-1 text-[12px] text-muted">
                      Source {c.sourceId} · Detected {fmt(c.detectedAt)} · Confidence{" "}
                      {confidenceLabel(c.confidence)}
                    </p>
                  </div>
                  <Link
                    to="/admin/candidates/$id"
                    params={{ id: c.id }}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                  >
                    Review
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {conflicts.length > 0 && (
        <section aria-labelledby="conflicts">
          <h2 id="conflicts" className="text-lg font-extrabold text-ink">
            Open conflicts ({conflicts.length})
          </h2>
          <p className="text-sm text-muted">
            Two sources propose different values. Raasta never picks one automatically.
          </p>
          <ul className="mt-3 space-y-3">
            {conflicts.map((c) => (
              <li key={c.id} className="rounded-2xl bg-warning-tint p-4 ring-1 ring-warning/25">
                <p className="font-bold text-ink">{label(c.entityId)}</p>
                <p className="text-sm text-ink">
                  {c.sourceA}: PKR {c.valueA.toLocaleString("en-US")}{" "}
                  <span className="text-muted">vs</span> {c.sourceB}: PKR{" "}
                  {c.valueB.toLocaleString("en-US")}
                </p>
                <ConflictForm id={c.id} onDone={load} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <SourceList title="Stale sources" items={d.staleSources} empty="None" />
        <SourceList title="Unreachable sources" items={d.unreachableSources} empty="None" />
        <SourceList
          title="Manual verification required"
          items={d.manualSources}
          empty="None"
          manual
        />
      </div>

      <section aria-labelledby="recent">
        <h2 id="recent" className="text-lg font-extrabold text-ink">
          Recent decisions
        </h2>
        <ul className="mt-3 divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
          {recent.length === 0 && <li className="p-4 text-sm text-muted">No decisions yet.</li>}
          {recent.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <span>
                <b className="text-ink">{label(c.entityId)}</b>{" "}
                {c.kind === "value_change" && (
                  <>
                    PKR {c.oldValue} → {c.proposedValue}
                  </>
                )}
              </span>
              <span className="text-muted">
                {c.status} · {fmt(c.reviewedAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SourceList({
  title,
  items,
  empty,
  manual,
}: {
  title: string;
  items: Data["dashboard"]["staleSources"];
  empty: string;
  manual?: boolean;
}) {
  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <h3 className="text-sm font-bold text-ink">
        {title} ({items.length})
      </h3>
      <ul className="mt-2 space-y-2 text-[13px]">
        {items.length === 0 && <li className="text-muted">{empty}</li>}
        {items.map((s) => (
          <li key={s.id}>
            <p className="font-semibold text-ink">{s.name}</p>
            <p className="text-muted">
              {manual
                ? (s.manualReason ?? "Manual")
                : `Last success ${fmt(s.lastSuccessAt)}${s.failures ? ` · ${s.failures} failures` : ""}`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConflictForm({ id, onDone }: { id: string; onDone: () => Promise<void> }) {
  const [note, setNote] = useState("");
  async function close(status: "resolved" | "dismissed") {
    try {
      await resolveConflictFn({ data: { id, status, note } });
      await onDone();
    } catch {
      toast.error("Could not update the conflict (a note of at least 3 characters is required)");
    }
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <input
        aria-label="Resolution note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Resolution note (required)"
        className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm"
      />
      <button
        onClick={() => void close("resolved")}
        className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
      >
        Mark resolved
      </button>
      <button
        onClick={() => void close("dismissed")}
        className="rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-line"
      >
        Dismiss
      </button>
    </div>
  );
}
