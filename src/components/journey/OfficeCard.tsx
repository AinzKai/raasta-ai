import { MapPin, Phone } from "lucide-react";

import { directionsUrl, pick, thirdPartyName, type OfficeRecord } from "@/lib/knowledge";
import { useLocale } from "@/lib/i18n";
import { OriginTag, TrustBadge } from "./trust";

export function OfficeCard({ office }: { office: OfficeRecord }) {
  const { lang, T, tf } = useLocale();
  const mapUrl = directionsUrl(office);
  return (
    <article className="rounded-3xl bg-surface p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-bold text-ink">{pick(office.name, lang)}</h3>
        <TrustBadge record={office} />
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {T("addressLabel")}
          </dt>
          <dd className="text-ink">
            {office.address}, {office.city}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {T("hoursLabel")}
          </dt>
          <dd className={office.hours ? "text-ink" : "text-muted"}>
            {office.hours ? pick(office.hours, lang) : T("hoursNotVerified")}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {T("phoneLabel")}
          </dt>
          <dd className={office.phone ? "text-ink" : "text-muted"}>
            {office.phone ?? T("phoneNotVerified")}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-dashed border-muted/60 bg-paper px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
        >
          <MapPin className="size-4" aria-hidden />
          {T("getDirections")}
        </a>
        {office.phone && (
          <a
            href={`tel:${office.phone.replace(/[^\d+]/g, "")}`}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary-tint"
          >
            <Phone className="size-4" aria-hidden />
            {office.phone}
          </a>
        )}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <OriginTag url={mapUrl} />
        <span>{tf("thirdPartyNote", { name: thirdPartyName(mapUrl) })}</span>
      </p>
    </article>
  );
}
