import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Clock, Landmark, MapPin, Phone } from "lucide-react";

import { getService } from "@/lib/knowledge";
import { Disclaimer, FeeTable, RouteSteps, ServiceIcon, SourceList } from "@/components/civic";

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    const service = getService(params.slug);
    if (!service) throw notFound();
    return { service };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Service not found — Raasta AI" }, { name: "robots", content: "noindex" }] };
    }
    const { service } = loaderData;
    const title = `${service.name} in Pakistan — documents, fees & steps | Raasta AI`;
    const description = `${service.summary} Issued by ${service.agencyFull}. ${service.timeline}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ServiceDetail,
});

function ServiceDetail() {
  const { service } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link to="/services" className="text-xs font-bold text-primary">
        ← All services
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-tint text-primary">
          <ServiceIcon name={service.icon} className="size-6" />
        </span>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{service.name}</h1>
          <p className="urdu mt-1 text-base text-muted">{service.urduName}</p>
        </div>
      </div>

      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">{service.summary}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Landmark, label: "Department", value: service.agencyFull },
          { icon: MapPin, label: "Applies to", value: service.jurisdiction },
          { icon: Clock, label: "Typical time", value: service.timeline },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <item.icon className="size-3.5" />
              {item.label}
            </span>
            <p className="mt-1.5 text-sm font-semibold leading-snug">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-extrabold tracking-tight">What to bring</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {service.documents.map((doc) => (
            <li
              key={doc}
              className="rounded-2xl bg-surface px-4 py-3 text-sm leading-relaxed ring-1 ring-line"
            >
              {doc}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-extrabold tracking-tight">The route, step by step</h2>
        <RouteSteps steps={service.steps} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-extrabold tracking-tight">Fees</h2>
        <div className="mt-3">
          <FeeTable fees={service.fees} note={service.confidenceNote} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-extrabold tracking-tight">Sources</h2>
        <p className="mt-1 text-xs text-muted">Checked against official pages. Open them to re-verify.</p>
        <div className="mt-3">
          <SourceList sources={service.sources} />
        </div>
        {service.helpline && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Phone className="size-4 text-primary" />
            Helpline: <span className="font-semibold text-ink">{service.helpline}</span>
          </p>
        )}
      </section>

      <div className="mt-8">
        <Disclaimer>
          Raasta AI is not affiliated with any government department and cannot submit your
          application. Confirm fees and requirements at the counter before you pay.
        </Disclaimer>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/chat"
          search={{ q: `I need help with ${service.name.toLowerCase()}`, service: service.slug }}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Ask about my situation
          <ArrowRight className="size-4" />
        </Link>
        <Link
          to="/complaints"
          search={{ service: service.slug }}
          className="inline-flex items-center rounded-2xl bg-surface px-5 py-3 text-sm font-bold ring-1 ring-line"
        >
          Report a problem with this service
        </Link>
      </div>
    </div>
  );
}
