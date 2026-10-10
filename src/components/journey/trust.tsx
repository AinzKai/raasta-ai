import {
  BadgeCheck,
  CircleAlert,
  CircleHelp,
  ExternalLink,
  Landmark,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  effectiveStatus,
  getAgency,
  getSource,
  linkOrigin,
  statusExplanation,
  thirdPartyName,
  type SourceRecord,
  statusLabel,
  type Lang,
  type Provenance,
  type VerificationStatus,
} from "@/lib/knowledge";
import { useLocale } from "@/lib/i18n";
import { userFreshness } from "@/lib/freshness/policy";

const TONE: Record<VerificationStatus, string> = {
  verified: "bg-primary-tint text-primary ring-primary/20",
  official_source: "bg-source-tint text-[#7a5c1f] ring-source/30",
  needs_confirmation: "bg-warning-tint text-warning ring-warning/25",
  not_verified: "bg-surface text-muted ring-line",
  user_provided: "bg-surface text-ink ring-line",
};

const ICON: Record<VerificationStatus, typeof ShieldCheck> = {
  verified: ShieldCheck,
  official_source: BadgeCheck,
  needs_confirmation: CircleAlert,
  not_verified: CircleHelp,
  user_provided: UserRound,
};

/** Status chip. Always icon + words, never colour alone. */
export function StatusChip({
  status,
  lang,
  className = "",
}: {
  status: VerificationStatus;
  lang: Lang;
  className?: string;
}) {
  const Icon = ICON[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${TONE[status]} ${className}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {statusLabel(status, lang)}
    </span>
  );
}

function formatDate(iso: string | null, lang: Lang): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "ur" ? "ur-PK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Clickable verification chip. Opens the provenance: source, agency, what the
 * status means, how we know, and when it was last read or verified.
 * Renders a real <button>; never place it inside another button.
 */
export function TrustBadge({ record, label }: { record: Provenance; label?: string }) {
  const { lang, T, tf } = useLocale();
  const now = new Date();
  const status = effectiveStatus(record, now);
  // A source record is its own source.
  const source =
    getSource(record.sourceId) ?? ("agencyId" in record ? (record as SourceRecord) : undefined);
  const agency = source ? getAgency(source.agencyId) : undefined;
  const checked = formatDate(record.lastCheckedAt ?? source?.lastCheckedAt ?? null, lang);
  const verified = formatDate(record.lastVerifiedAt ?? null, lang);
  const age = userFreshness(
    record.lastVerifiedAt ?? record.lastCheckedAt ?? source?.lastCheckedAt ?? null,
    now,
  );

  return (
    <Popover>
      <PopoverTrigger
        className="touch-target -m-1.5 inline-flex items-center rounded-full p-1.5 outline-offset-0"
        aria-label={tf("trustAria", { status: label ?? statusLabel(status, lang) })}
      >
        <StatusChip status={status} lang={lang} />
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3 text-sm" align="start">
        <div>
          <StatusChip status={status} lang={lang} />
          <p className="mt-2 text-muted">{statusExplanation(status, lang)}</p>
        </div>
        <dl className="space-y-2 text-[13px]">
          {source && (
            <div>
              <dt className="font-bold text-ink">{T("trustSource")}</dt>
              <dd className="text-muted">{source.title}</dd>
            </div>
          )}
          {agency && (
            <div>
              <dt className="font-bold text-ink">{T("trustAgency")}</dt>
              <dd className="text-muted">{agency.fullName}</dd>
            </div>
          )}
          <div>
            <dt className="font-bold text-ink">{T("trustBasis")}</dt>
            <dd className="text-muted">{record.basis}</dd>
          </div>
          <div className="flex gap-6">
            <div>
              <dt className="font-bold text-ink">{T("trustChecked")}</dt>
              <dd className="text-muted">{checked ?? T("trustNone")}</dd>
            </div>
            <div>
              <dt className="font-bold text-ink">{T("trustVerified")}</dt>
              <dd className="text-muted">{verified ?? T("trustNone")}</dd>
            </div>
          </div>
          {age.level === "confirm" && age.daysAgo !== null && (
            <p className="rounded-lg bg-warning-tint p-2 text-[12px] font-semibold text-ink">
              {tf("staleConfirm", { n: age.daysAgo })}
            </p>
          )}
          {record.notes && (
            <p className="rounded-lg bg-source-tint p-2 text-[12px] text-ink">{record.notes}</p>
          )}
        </dl>
        {source && source.url.startsWith("https://") && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            {T("trustOpen")}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Says where a link leads. Government sites and third-party tools look
 * different on purpose: a map link is a convenience, not an official source.
 * Phone links need no tag.
 */
export function OriginTag({ url, className = "" }: { url: string; className?: string }) {
  const { T } = useLocale();
  const origin = linkOrigin(url);
  if (origin === "phone") return null;
  if (origin === "government")
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink ring-1 ring-line ${className}`}
      >
        <Landmark className="size-3 shrink-0" aria-hidden />
        {T("govSite")}
      </span>
    );
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-dashed border-muted/60 bg-paper px-1.5 py-0.5 text-[11px] font-semibold text-muted ${className}`}
    >
      <ExternalLink className="size-3 shrink-0" aria-hidden />
      {T("thirdPartyTool")} · {thirdPartyName(url)}
    </span>
  );
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.startsWith("tel:") ? url.replace("tel:", "") : url;
  }
}
