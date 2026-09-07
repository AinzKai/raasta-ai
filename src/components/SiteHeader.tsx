import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { RaastaWordmark } from "@/components/RaastaLogo";
import { useLang, t } from "@/lib/i18n";
import { useSession } from "@/hooks/useSession";

const NAV = [
  { to: "/services", key: "navServices" },
  { to: "/chat", key: "navAssistant" },
  { to: "/complaints", key: "navComplaints" },
  { to: "/about", key: "navAbout" },
] as const;

export function SiteHeader() {
  const [lang, setLang] = useLang();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="shrink-0">
          <RaastaWordmark compact />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-primary-tint hover:text-primary"
              activeProps={{ className: "bg-primary-tint text-primary" }}
            >
              {t(item.key, lang)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-xl bg-surface p-0.5 ring-1 ring-line">
            {(["en", "ur"] as const).map((code) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  lang === code ? "bg-primary text-primary-foreground" : "text-muted hover:text-ink"
                } ${code === "ur" ? "urdu" : ""}`}
              >
                {code === "en" ? "EN" : "اردو"}
              </button>
            ))}
          </div>

          <Link
            to={session ? "/account" : "/auth"}
            className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-primary ring-1 ring-line transition-colors hover:bg-primary-tint sm:inline-flex"
          >
            {session ? t("account", lang) : t("signIn", lang)}
          </Link>

          <Link
            to="/chat"
            className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover sm:inline-flex"
          >
            {t("ask", lang)}
          </Link>

          <button
            className="rounded-xl p-2 ring-1 ring-line md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-surface px-4 py-3 md:hidden">
          <div className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-ink"
              >
                {t(item.key, lang)}
              </Link>
            ))}
            <Link
              to={session ? "/account" : "/auth"}
              className="rounded-xl px-3 py-3 text-sm font-semibold text-primary"
            >
              {session ? t("account", lang) : t("signIn", lang)}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
