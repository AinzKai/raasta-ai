import { Link } from "@tanstack/react-router";
import { RaastaMark } from "@/components/RaastaLogo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <RaastaMark className="size-6" />
            <span className="text-sm font-extrabold tracking-tight text-ink">RAASTA AI</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Raasta AI is an independent guide. It is not a government service and cannot submit
            applications on your behalf. Always confirm fees and requirements with the official
            office before you pay.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Explore</h3>
          <div className="mt-3 flex flex-col gap-2 text-sm font-medium">
            <Link to="/services" className="text-ink hover:text-primary">
              All services
            </Link>
            <Link to="/chat" className="text-ink hover:text-primary">
              Assistant
            </Link>
            <Link to="/complaints" className="text-ink hover:text-primary">
              File a complaint
            </Link>
            <Link to="/about" className="text-ink hover:text-primary">
              How Raasta checks facts
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Official helplines</h3>
          <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
            <span>
              NADRA · <span className="font-semibold text-ink">1777</span>
            </span>
            <span>
              Passports · <span className="font-semibold text-ink">051-111-344-777</span>
            </span>
            <span>
              Citizen Portal · <span className="font-semibold text-ink">pmdu.gov.pk</span>
            </span>
          </div>
        </div>
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-xs text-muted sm:px-6">
        Guidance only — verify with the issuing authority before you act.
      </div>
    </footer>
  );
}
