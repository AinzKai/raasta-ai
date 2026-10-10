import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  Route as RouteIcon,
  ListChecks,
  MousePointerClick,
} from "lucide-react";
import { useState } from "react";

import { GoalInput } from "@/components/GoalInput";
import { JourneyPreview } from "@/components/journey/JourneyPreview";
import { copy } from "@/lib/copy";
import { useLocale } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Raasta — Your path through Pakistan's civic services" },
      {
        name: "description",
        content: "Turn confusing civic procedures into verified, step-by-step journeys.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { lang, T } = useLocale();
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const go = (q: string) => navigate({ to: "/chat", search: { q } });

  const examples = (["exampleCar", "exampleCnic", "examplePassport", "exampleLost"] as const).map(
    (k) => copy(k, lang),
  );

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-primary">
            {T("heroKicker")}
          </p>
          <p className="mt-1 text-sm font-semibold text-muted">{T("brandTagline")}</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            {T("heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">{T("heroSub")}</p>
          <div className="mt-7 max-w-2xl">
            <GoalInput value={goal} onChange={setGoal} onSubmit={() => go(goal)} large />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {examples.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => go(e)}
                className="touch-target rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink ring-1 ring-line hover:bg-primary-tint hover:text-primary"
              >
                {e}
              </button>
            ))}
          </div>
          <Link
            to="/demo"
            className="touch-target mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary underline-offset-4 hover:underline"
          >
            {T("seeExample")}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
        <JourneyPreview />
      </section>

      <section className="border-y border-line bg-surface/60 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">{T("howTitle")}</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { icon: RouteIcon, t: T("howUnderstand"), b: T("howUnderstandBody") },
              { icon: ListChecks, t: T("howPrepare"), b: T("howPrepareBody") },
              { icon: MousePointerClick, t: T("howAct"), b: T("howActBody") },
            ].map((s, i) => (
              <li key={s.t} className="rounded-3xl bg-surface p-5 ring-1 ring-line">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary-tint text-primary">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-3 text-lg font-extrabold text-ink">
                  <span className="text-primary">{i + 1}.</span> {s.t}
                </h3>
                <p className="mt-1 text-sm text-muted">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid items-center gap-8 rounded-3xl bg-primary p-8 text-primary-foreground md:grid-cols-[1.2fr_1fr] md:p-10">
          <div>
            <ShieldCheck className="size-8" aria-hidden />
            <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">
              {T("trustTitle")}
            </h2>
            <p className="mt-3 text-primary-foreground/85">{T("trustBody")}</p>
          </div>
          <ul className="space-y-3 text-sm font-semibold">
            {[T("trustPoint1"), T("trustPoint2"), T("trustPoint3")].map((p) => (
              <li key={p} className="rounded-2xl bg-white/10 p-3.5">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
