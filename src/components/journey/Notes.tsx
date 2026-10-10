import { Info, TriangleAlert, ExternalLink } from "lucide-react";

import type { SourceRecord, TimelineRecord, WarningRecord } from "@/lib/knowledge";
import { pick } from "@/lib/knowledge";
import { useLocale } from "@/lib/i18n";
import { TrustBadge, hostOf } from "./trust";

export function WarningList({ warnings }: { warnings: WarningRecord[] }) {
  const { lang, T } = useLocale();
  if (warnings.length === 0) return null;
  return (
    <section aria-labelledby="warn-title" className="space-y-3">
      <h2 id="warn-title" className="text-lg font-extrabold tracking-tight text-ink">
        {T("warningsTitle")}
      </h2>
      <ul className="space-y-2.5">
        {warnings.map((w) => {
          const Icon = w.tone === "caution" ? TriangleAlert : Info;
          return (
            <li
              key={w.id}
              className={`rounded-2xl p-4 ring-1 ${w.tone === "caution" ? "bg-warning-tint ring-warning/20" : "bg-source-tint ring-source/25"}`}
            >
              <div className="flex gap-3">
                <Icon
                  className={`mt-0.5 size-5 shrink-0 ${w.tone === "caution" ? "text-warning" : "text-source"}`}
                  aria-hidden
                />
                <div className="min-w-0 space-y-2">
                  <p className="text-sm text-ink">{pick(w.text, lang)}</p>
                  <TrustBadge record={w} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TimelineList({ timelines }: { timelines: TimelineRecord[] }) {
  const { lang, T } = useLocale();
  if (timelines.length === 0) return null;
  return (
    <section aria-labelledby="time-title" className="space-y-3">
      <h2 id="time-title" className="text-lg font-extrabold tracking-tight text-ink">
        {T("timelineTitle")}
      </h2>
      <ul className="space-y-2.5">
        {timelines.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface p-4 ring-1 ring-line"
          >
            <p className="text-sm text-ink">{pick(t.text, lang)}</p>
            <TrustBadge record={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SourceList({ sources }: { sources: SourceRecord[] }) {
  const { T } = useLocale();
  if (sources.length === 0) return null;
  return (
    <details className="rounded-2xl bg-surface ring-1 ring-line">
      <summary className="touch-target flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-ink">
        {T("sourcesTitle")}
        <span className="text-xs font-semibold text-muted">{sources.length}</span>
      </summary>
      <div className="space-y-3 px-4 pb-4">
        <p className="text-[13px] text-muted">{T("sourcesSub")}</p>
        <ul className="space-y-2">
          {sources.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 first:border-0 first:pt-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{s.title}</p>
                <p className="truncate text-[12px] text-muted">{hostOf(s.url)}</p>
              </div>
              <div className="flex items-center gap-2">
                <TrustBadge record={s} />
                {s.url.startsWith("https://") && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${T("trustOpen")}: ${s.title}`}
                    className="touch-target grid place-items-center rounded-full text-muted ring-1 ring-line hover:text-ink"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
