import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";

import { SERVICES } from "@/lib/knowledge";
import { ServiceIcon } from "@/components/civic";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Services directory — Raasta AI" },
      {
        name: "description",
        content:
          "Browse Pakistani government services by department: NADRA, passports, excise, FBR, police and district administration.",
      },
      { property: "og:title", content: "Services directory — Raasta AI" },
      {
        name: "og:description",
        content: "Find the department, documents and steps for the paperwork you need.",
      },
    ],
  }),
  component: ServicesIndex,
});

function ServicesIndex() {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const results = SERVICES.filter(
    (s) =>
      !term ||
      s.name.toLowerCase().includes(term) ||
      s.agency.toLowerCase().includes(term) ||
      s.summary.toLowerCase().includes(term) ||
      s.urduName.includes(q.trim()),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Services directory</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Every entry lists the issuing department, what to bring, and which fees are confirmed
        against an official source.
      </p>

      <div className="mt-6 flex max-w-md items-center gap-2 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-primary">
        <Search className="size-4 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search service or department"
          aria-label="Search service or department"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {results.map((service) => (
          <Link
            key={service.slug}
            to="/services/$slug"
            params={{ slug: service.slug }}
            className="rounded-3xl bg-surface p-6 ring-1 ring-line transition-shadow hover:shadow-lift"
          >
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-tint text-primary">
                <ServiceIcon name={service.icon} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight">{service.name}</h2>
                  <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[11px] font-bold text-primary">
                    {service.agency}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{service.summary}</p>
                <p className="mt-2 text-xs text-muted">{service.timeline}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!results.length && (
        <p className="mt-10 text-sm text-muted">
          Nothing matches "{q}" yet. Try the assistant — it can still help with related paperwork.
        </p>
      )}
    </div>
  );
}
