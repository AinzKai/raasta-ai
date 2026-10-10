import { Link } from "@tanstack/react-router";
import { RaastaMark } from "@/components/RaastaLogo";
import { useLocale } from "@/lib/i18n";

export function SiteFooter() {
  const { T } = useLocale();
  return (
    <footer className="mt-16 border-t border-line bg-surface pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <RaastaMark className="size-6" />
            <span className="text-sm font-extrabold tracking-tight text-ink">RAASTA</span>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            {T("brandTagline")}. Raasta is an independent guide, not a government service, and it
            cannot submit anything on your behalf. Confirm fees and requirements at the official
            source before you pay.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm font-medium">
          <Link to="/about" className="text-ink hover:text-primary">
            {T("navAbout")}
          </Link>
          <Link to="/status" className="text-ink hover:text-primary">
            System status
          </Link>
          <Link to="/demo" className="text-ink hover:text-primary">
            {T("seeExample")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
