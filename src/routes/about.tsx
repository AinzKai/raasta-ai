import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Database, Bot, Search } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How Raasta checks facts — Raasta AI" },
      {
        name: "description",
        content:
          "Raasta AI keeps a verified knowledge base of Pakistani government services. Every fee carries a source or is marked unconfirmed.",
      },
      { property: "og:title", content: "How Raasta checks facts — Raasta AI" },
      {
        property: "og:description",
        content:
          "Every number on Raasta is backed by an official source, or clearly labelled as unverified.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">
        How Raasta checks facts
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
        Raasta AI is an independent guide to Pakistani government services. It
        is not affiliated with any government department. Every number you see
        on this site is either backed by an official source or clearly marked
        as unconfirmed.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {[
          {
            icon: Database,
            title: "Verified knowledge base",
            body: "A curated database of services, fees, documents and step-by-step routes. Every fee entry carries either a source URL or the tag 'not confirmed'.",
          },
          {
            icon: Search,
            title: "Source-first approach",
            body: "We check official department websites, FAQs and published fee schedules. If a fee conflicts across sources, Raasta shows no number until it can read an official page.",
          },
          {
            icon: Bot,
            title: "AI grounded in facts",
            body: "The assistant uses the knowledge base as its only source. It is instructed never to guess fees, timelines or requirements from memory.",
          },
          {
            icon: ShieldCheck,
            title: "Transparent limits",
            body: "When Raasta cannot verify something — because a fee page blocks automated access or charges vary by district — it tells you exactly why and gives you a helpline to call.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl bg-surface p-5 ring-1 ring-line">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary-tint text-primary">
              <item.icon className="size-5" />
            </span>
            <h2 className="mt-3 text-base font-bold">{item.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-extrabold tracking-tight">What Raasta is not</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          <li>
            <strong className="text-ink">Not a government service.</strong>{" "}
            Raasta cannot submit applications, pay fees or book appointments on
            your behalf.
          </li>
          <li>
            <strong className="text-ink">Not legal advice.</strong> The
            checklists are practical guides, not a substitute for professional
            legal or immigration counsel.
          </li>
          <li>
            <strong className="text-ink">Not实时 (real-time).</strong> Fees and
            processes change with annual budgets. Always confirm at the counter
            before you pay.
          </li>
        </ul>
      </section>

      <div className="mt-10">
        <Link
          to="/chat"
          className="inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Try the assistant
        </Link>
      </div>
    </div>
  );
}
