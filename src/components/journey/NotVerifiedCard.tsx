import { CircleHelp, ExternalLink } from "lucide-react";

import { resolveSourceId, type SourceRecord } from "@/lib/knowledge";
import { useLocale } from "@/lib/i18n";
import type { CopyKey } from "@/lib/copy";

const BODY: Record<"fee" | "documents" | "other", CopyKey> = {
  fee: "notVerifiedFee",
  documents: "notVerifiedDocs",
  other: "notVerifiedOther",
};

/** The responsible-AI moment: Raasta declines to guess and points to the official source. */
export function NotVerifiedCard({
  topic = "other",
  sourceIds = [],
  compact = false,
}: {
  topic?: "fee" | "documents" | "other";
  sourceIds?: string[];
  compact?: boolean;
}) {
  const { T } = useLocale();
  const sources = sourceIds
    .map((id) => resolveSourceId(id))
    .flatMap((r) => (r.ok ? [r.record] : []))
    .filter((s: SourceRecord) => s.url.startsWith("https://"));

  return (
    <div
      role="status"
      className={`rounded-3xl bg-surface ring-1 ring-line ${compact ? "p-4" : "p-6"}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-paper text-muted ring-1 ring-line">
          <CircleHelp className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {T("notVerifiedTitle")}
          </p>
          <p className="mt-1 text-base font-bold text-ink">{T(BODY[topic])}</p>
          {!compact && <p className="mt-2 text-sm text-muted">{T("notVerifiedHint")}</p>}
          {sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sources.slice(0, 2).map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  {T("trustOpen")} · {s.title.split(" — ")[0]}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
