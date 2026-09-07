import type { ComponentType } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Car,
  CreditCard,
  ExternalLink,
  FileText,
  Home,
  Plane,
  Receipt,
  Shield,
} from "lucide-react";

import type { Fee, Service, Source, Step } from "@/lib/knowledge";

const ICONS: Record<Service["icon"], ComponentType<{ className?: string }>> = {
  id: CreditCard,
  plane: Plane,
  car: Car,
  file: FileText,
  receipt: Receipt,
  shield: Shield,
  home: Home,
  alert: AlertTriangle,
};

export function ServiceIcon({
  name,
  className = "size-5",
}: {
  name: Service["icon"];
  className?: string;
}) {
  const Icon = ICONS[name] ?? FileText;
  return <Icon className={className} />;
}

/** The dotted route: each step is a stop, the last one closes the line. */
export function RouteSteps({ steps }: { steps: Step[] }) {
  return (
    <ol className="mt-2">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={`${step.title}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className="absolute left-[15px] top-9 bottom-0 border-l-2 border-dotted border-primary/40"
              />
            )}
            <span
              className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                last
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary-tint text-primary ring-1 ring-primary/20"
              }`}
            >
              {i + 1}
            </span>
            <div className="pt-1">
              <p className="text-[15px] font-bold leading-snug">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function UnverifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-tint px-2 py-0.5 text-[11px] font-bold text-warning">
      <AlertTriangle className="size-3" />
      Not confirmed
    </span>
  );
}

export function FeeTable({ fees, note }: { fees: Fee[]; note?: string | null }) {
  if (!fees.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-line">
      <table className="w-full text-sm">
        <thead className="bg-primary-tint text-left">
          <tr>
            <th className="px-4 py-2.5 font-bold text-primary">Fee</th>
            <th className="px-4 py-2.5 font-bold text-primary">Amount</th>
            <th className="hidden px-4 py-2.5 font-bold text-primary sm:table-cell">Processing</th>
          </tr>
        </thead>
        <tbody className="bg-surface">
          {fees.map((fee, i) => (
            <tr key={`${fee.label}-${i}`} className="border-t border-line align-top">
              <td className="px-4 py-3 font-medium">
                {fee.label}
                {fee.note && <p className="mt-1 text-xs text-muted">{fee.note}</p>}
              </td>
              <td className="px-4 py-3">
                {fee.amountPkr === null || fee.unverified ? (
                  <UnverifiedBadge />
                ) : (
                  <span className="font-bold">PKR {fee.amountPkr.toLocaleString("en-PK")}</span>
                )}
              </td>
              <td className="hidden px-4 py-3 text-muted sm:table-cell">
                {fee.processingDays ? `${fee.processingDays} days` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && (
        <p className="border-t border-line bg-warning-tint px-4 py-3 text-xs leading-relaxed text-warning">
          {note}
        </p>
      )}
    </div>
  );
}

export function SourceList({ sources }: { sources: Pick<Source, "title" | "url">[] }) {
  if (!sources.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex max-w-full items-center gap-2 rounded-xl bg-source-tint px-3 py-2 text-xs font-semibold text-source ring-1 ring-source/25 transition-colors hover:bg-source/10"
        >
          <BadgeCheck className="size-3.5 shrink-0" />
          <span className="truncate">{source.title}</span>
          <ExternalLink className="size-3 shrink-0 opacity-60" />
        </a>
      ))}
    </div>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-2xl bg-warning-tint px-4 py-3 text-xs leading-relaxed text-warning">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
