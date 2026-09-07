import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, MessageSquareText, ScanLine, ShieldCheck } from "lucide-react";

import { SERVICES, PRIMARY_SLUGS } from "@/lib/knowledge";
import { ServiceIcon } from "@/components/civic";
import { useLang, t } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Raasta AI — CNIC, passport & vehicle paperwork made clear" },
      {
        name: "description",
        content:
          "Ask in Urdu, Roman Urdu or English. Raasta AI turns Pakistani government processes into a sourced checklist of documents, fees and offices.",
      },
      { property: "og:title", content: "Raasta AI — Your path, simplified" },
      {
        property: "og:description",
        content:
          "A sourced, step-by-step guide to CNIC renewal, passport renewal and vehicle transfer in Pakistan.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [lang] = useLang();
  const [question, setQuestion] = useState("");
  const navigate = useNavigate();
  const primary = SERVICES.filter((s) => PRIMARY_SLUGS.includes(s.slug));
  const rest = SERVICES.filter((s) => !PRIMARY_SLUGS.includes(s.slug));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    navigate({ to: "/chat", search: { q } });
  }

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-tint px-3 py-1.5 text-xs font-bold text-primary">
            <ShieldCheck className="size-3.5" />
            Sourced answers · Islamabad first
          </span>

          <h1
            className={`mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl ${
              lang === "ur" ? "urdu" : ""
            }`}
          >
            {t("heroTitle", lang)}
          </h1>
          <p
            className={`mt-4 max-w-2xl text-[15px] leading-relaxed text-muted ${
              lang === "ur" ? "urdu" : ""
            }`}
          >
            {t("heroSub", lang)}
          </p>

          <form
            onSubmit={submit}
            className="mt-8 max-w-2xl rounded-3xl bg-surface p-2 ring-1 ring-line focus-within:ring-2 focus-within:ring-primary"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) submit(e);
                }}
                rows={2}
                placeholder={t("askPlaceholder", lang)}
                aria-label="Describe your problem"
                className="min-h-[64px] flex-1 resize-none bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                {t("ask", lang)}
                <ArrowRight className="size-4" />
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "Mera CNIC expire ho gaya hai, ab kya karun?",
              "Passport renewal fees and time?",
              "گاڑی کی منتقلی اسلام آباد میں کیسے کریں؟",
            ].map((example) => (
              <button
                key={example}
                onClick={() => navigate({ to: "/chat", search: { q: example } })}
                className="rounded-full bg-surface px-3.5 py-2 text-xs font-semibold text-muted ring-1 ring-line transition-colors hover:text-primary"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-xl font-extrabold tracking-tight">Start with a service</h2>
        <p className="mt-1 text-sm text-muted">
          Three fully mapped journeys, plus a growing directory of departments.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {primary.map((service) => (
            <Link
              key={service.slug}
              to="/services/$slug"
              params={{ slug: service.slug }}
              className="group rounded-3xl bg-surface p-6 ring-1 ring-line transition-shadow hover:shadow-lift"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-primary-tint text-primary">
                <ServiceIcon name={service.icon} />
              </span>
              <h3 className="mt-4 text-[17px] font-bold tracking-tight">{service.name}</h3>
              <p className="urdu mt-1 text-sm text-muted">{service.urduName}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{service.summary}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                See the checklist
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rest.map((service) => (
            <Link
              key={service.slug}
              to="/services/$slug"
              params={{ slug: service.slug }}
              className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-line transition-colors hover:ring-primary/40"
            >
              <span className="text-primary">
                <ServiceIcon name={service.icon} className="size-4" />
              </span>
              <span className="text-sm font-semibold">{service.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3">
          {[
            {
              icon: MessageSquareText,
              title: "Ask in your own words",
              body: "Urdu, Roman Urdu or English — Raasta replies in the language you wrote in.",
            },
            {
              icon: ShieldCheck,
              title: "Every number is sourced",
              body: "Confirmed fees carry an official link. Anything unconfirmed is labelled, never guessed.",
            },
            {
              icon: ScanLine,
              title: "Check your documents",
              body: "Upload a photo of your papers and Raasta flags what looks missing before you queue.",
            },
          ].map((item) => (
            <div key={item.title}>
              <span className="grid size-10 place-items-center rounded-2xl bg-primary-tint text-primary">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-bold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Treated unfairly at a counter?</h2>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed opacity-90">
              Record the delay, the office and what happened. Raasta keeps a dated log you can take
              to the Citizen Portal or the department's own complaint desk.
            </p>
          </div>
          <Link
            to="/complaints"
            className="shrink-0 rounded-2xl bg-primary-foreground px-5 py-3 text-sm font-bold text-primary"
          >
            File a complaint
          </Link>
        </div>
      </section>
    </>
  );
}
