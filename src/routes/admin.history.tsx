import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getEntityHistory, rollbackVersionFn } from "@/lib/knowledge-admin.functions";

export const Route = createFileRoute("/admin/history")({ component: History });

type Data = Awaited<ReturnType<typeof getEntityHistory>>;
const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " UTC"
    : "—";

function History() {
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(
    () =>
      getEntityHistory({ data: {} })
        .then(setD)
        .catch(() => setError(true)),
    [],
  );
  useEffect(() => void load(), [load]);

  async function rollback(versionId: string, version: number) {
    const reason = window.prompt(`Why roll back version ${version}? (required)`);
    if (!reason || reason.trim().length < 3) return;
    try {
      const r = await rollbackVersionFn({ data: { versionId, reason } });
      toast.success(
        `Rolled back. Active value is now ${r.restored.value ?? "unknown"} (version ${r.restored.version}).`,
      );
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rollback failed");
    }
  }

  if (error)
    return (
      <div role="alert" className="text-warning">
        Could not load history.
      </div>
    );
  if (!d)
    return (
      <div role="status" className="text-muted">
        Loading…
      </div>
    );

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-extrabold text-ink">Knowledge versions</h1>
        <p className="text-sm text-muted">
          Version 1 is the seeded baseline in code. Rolling back never deletes anything; it marks a
          version rolled back and the previous value becomes active again.
        </p>
        {d.entities.length === 0 && (
          <p className="mt-3 text-sm text-muted">No approved changes yet.</p>
        )}
        {d.entities.map((e) => (
          <div key={e.entityId} className="mt-4 rounded-2xl bg-surface p-4 ring-1 ring-line">
            <p className="font-bold text-ink">
              {e.label} <span className="text-[12px] font-normal text-muted">{e.entityId}</span>
            </p>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="py-1">Version</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>From</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {e.history.map((h) => (
                  <tr key={h.version} className="border-t border-line">
                    <td className="py-1.5">v{h.version}</td>
                    <td className="tabular-nums">
                      {h.value === null ? "—" : `PKR ${h.value.toLocaleString("en-US")}`}
                    </td>
                    <td>{h.status}</td>
                    <td>{h.from ? fmt(h.from) : "—"}</td>
                    <td className="text-right">
                      {h.id && h.status !== "rolled-back" && h.status !== "seed" && (
                        <button
                          onClick={() => void rollback(h.id!, h.version)}
                          className="rounded-lg px-2.5 py-1 text-[13px] font-semibold text-warning ring-1 ring-line hover:bg-warning-tint"
                        >
                          Rollback
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>
      <section>
        <h2 className="text-lg font-extrabold text-ink">Audit trail</h2>
        <ul className="mt-3 divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
          {d.audit.length === 0 && <li className="p-4 text-sm text-muted">No entries.</li>}
          {d.audit.map((a) => (
            <li key={a.id} className="p-3 text-sm">
              <p>
                <b className="text-ink">{a.action.replace(/_/g, " ")}</b>{" "}
                <span className="text-muted">
                  · {a.entityId ?? "—"} · {a.actorKind}
                  {a.actor ? ` ${a.actor.slice(0, 8)}…` : ""} · {fmt(a.at)}
                </span>
              </p>
              <p className="break-words text-[12px] text-muted">{JSON.stringify(a.details)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
