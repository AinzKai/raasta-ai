import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { RaastaWordmark } from "@/components/RaastaLogo";
import { useLocale, LANGS } from "@/lib/i18n";
import { useSession } from "@/hooks/useSession";
import type { CopyKey } from "@/lib/copy";

const NAV: Array<{
  to: "/chat" | "/journeys" | "/services" | "/explain" | "/complaints" | "/about";
  key: CopyKey;
}> = [
  { to: "/chat", key: "navStart" },
  { to: "/journeys", key: "navJourneys" },
  { to: "/services", key: "navServices" },
  { to: "/explain", key: "navExplain" },
  { to: "/complaints", key: "navCases" },
];

const LANG_LABEL = { en: "EN", ur: "اردو", roman: "Roman" } as const;

export function SiteHeader() {
  const { lang, setLang, T } = useLocale();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {T("skipToContent")}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="shrink-0" aria-label="Raasta">
          <RaastaWordmark compact />
        </Link>

        <nav aria-label="Main" className="ms-4 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-primary-tint hover:text-primary"
              activeProps={{ className: "bg-primary-tint text-primary" }}
            >
              {T(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <div
            role="group"
            aria-label={T("language")}
            className="flex rounded-xl bg-surface p-0.5 ring-1 ring-line"
          >
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`touch-target rounded-[10px] px-2.5 text-xs font-bold transition-colors ${lang === code ? "bg-primary text-primary-foreground" : "text-muted hover:text-ink"} ${code === "ur" ? "urdu" : ""}`}
              >
                {LANG_LABEL[code]}
              </button>
            ))}
          </div>
          <Link
            to={session ? "/account" : "/auth"}
            className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-primary ring-1 ring-line hover:bg-primary-tint sm:inline-flex"
          >
            {session ? T("account") : T("signIn")}
          </Link>
          <button
            type="button"
            className="touch-target grid place-items-center rounded-xl ring-1 ring-line lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-surface px-4 py-3 lg:hidden">
          <div className="flex flex-col">
            {[...NAV, { to: "/about" as const, key: "navAbout" as const }].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="touch-target flex items-center rounded-xl px-3 text-sm font-semibold text-ink"
              >
                {T(item.key)}
              </Link>
            ))}
            <Link
              to={session ? "/account" : "/auth"}
              className="touch-target flex items-center rounded-xl px-3 text-sm font-semibold text-primary"
            >
              {session ? T("account") : T("signIn")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
