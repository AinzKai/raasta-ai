import { Link } from "@tanstack/react-router";
import { Home, ListChecks, Compass, Plus, User } from "lucide-react";

import { useLocale } from "@/lib/i18n";

/** Bottom navigation for phones — the primary way people use Raasta outside an office. */
export function MobileNav() {
  const { T } = useLocale();
  const items = [
    { to: "/", label: T("navHome"), icon: Home },
    { to: "/journeys", label: T("navJourneys"), icon: ListChecks },
    { to: "/chat", label: T("navStart"), icon: Plus, primary: true },
    { to: "/services", label: T("navServices"), icon: Compass },
    { to: "/account", label: T("account"), icon: User },
  ] as const;

  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
        {items.map((it) => (
          <li key={it.to} className="flex-1">
            <Link
              to={it.to}
              activeOptions={{ exact: it.to === "/" }}
              className="touch-target flex h-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-semibold text-muted"
              activeProps={{ className: "text-primary" }}
            >
              {"primary" in it ? (
                <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
                  <it.icon className="size-5" aria-hidden />
                </span>
              ) : (
                <it.icon className="size-5" aria-hidden />
              )}
              <span className="truncate">{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
