import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { useLocale } from "@/lib/i18n";
import {
  getAgency,
  getJurisdiction,
  listServices,
  pick,
  type ServiceCategory,
} from "@/lib/knowledge";
import type { CopyKey } from "@/lib/copy";

export const Route = createFileRoute("/services/")({
  head: () => ({ meta: [{ title: "Explore services — Raasta" }] }),
  component: Services,
});

const CATS: Array<{ id: ServiceCategory | "all"; key: CopyKey }> = [
  { id: "all", key: "catAll" },
  { id: "identity", key: "catIdentity" },
  { id: "travel", key: "catTravel" },
  { id: "vehicles", key: "catVehicles" },
  { id: "taxes", key: "catTaxes" },
  { id: "certificates", key: "catCertificates" },
];

function Services() {
  const { lang, T } = useLocale();
  const [cat, setCat] = useState<ServiceCategory | "all">("all");
  const services = listServices().filter((s) => cat === "all" || s.category === cat);
  const online = {
    full: "onlineFull",
    partial: "onlinePartial",
    offline: "onlineOffline",
  } as const;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{T("servicesTitle")}</h1>
        <p className="mt-1 text-muted">{T("servicesSub")}</p>
      </header>
      <div role="group" aria-label={T("servicesTitle")} className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cat === c.id}
            onClick={() => setCat(c.id)}
            className={`touch-target rounded-full px-4 py-2 text-sm font-semibold ring-1 ${cat === c.id ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-ink ring-line hover:bg-primary-tint"}`}
          >
            {T(c.key)}
          </button>
        ))}
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {services.map((s) => (
          <li key={s.id} className="flex flex-col rounded-3xl bg-surface p-5 ring-1 ring-line">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {getAgency(s.agencyId)?.name} ·{" "}
              {s.jurisdictions.map((j) => pick(getJurisdiction(j)?.name, lang)).join(", ")}
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-ink">{pick(s.name, lang)}</h2>
            <p className="mt-1 flex-1 text-sm text-muted">{pick(s.summary, lang)}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-[12px] font-semibold text-muted">{T(online[s.online])}</span>
              <Link
                to="/chat"
                search={{ service: s.slug }}
                className="touch-target inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                {T("startThisJourney")}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
