import { useState } from "react";
import { Copy, ExternalLink, FileDown, Globe, MapPin, Phone, Check } from "lucide-react";

import type { ActionKind, ActionRecord } from "@/lib/knowledge";
import { linkOrigin, pick, thirdPartyName } from "@/lib/knowledge";
import { copyText } from "@/lib/clipboard";
import { useLocale } from "@/lib/i18n";
import { OriginTag, TrustBadge, hostOf } from "./trust";

const ICON: Record<ActionKind, typeof Globe> = {
  open_portal: Globe,
  open_page: ExternalLink,
  download_form: FileDown,
  find_office: MapPin,
  fee_calculator: Globe,
  call: Phone,
};

export function ActionCard({ action }: { action: ActionRecord }) {
  const { lang, T, tf } = useLocale();
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const Icon = ICON[action.kind];
  const isCall = action.kind === "call";
  const number = isCall ? action.url.replace("tel:", "") : null;
  const thirdParty = linkOrigin(action.url) === "third_party";

  async function copyNumber() {
    if (!number) return;
    const ok = await copyText(number);
    setCopy(ok ? "copied" : "failed");
    setTimeout(() => setCopy("idle"), 2200);
  }

  return (
    <li
      className={
        thirdParty
          ? "rounded-2xl border border-dashed border-muted/60 bg-paper p-3.5"
          : "rounded-2xl bg-surface p-3.5 ring-1 ring-line"
      }
    >
      <a
        href={action.url}
        {...(isCall ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        className="touch-target flex items-center gap-3 rounded-xl p-1 hover:bg-primary-tint/60"
      >
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${
            thirdParty ? "bg-surface text-muted ring-1 ring-line" : "bg-primary-tint text-primary"
          }`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">{pick(action.label, lang)}</span>
          <span className="block truncate text-[12px] text-muted">
            {thirdParty ? thirdPartyName(action.url) : hostOf(action.url)}
          </span>
        </span>
        {!isCall && <ExternalLink className="size-4 shrink-0 text-muted" aria-hidden />}
      </a>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1">
        {thirdParty ? (
          // A map link is not a government source, so it carries no official-source badge.
          <OriginTag url={action.url} />
        ) : (
          <>
            <TrustBadge record={action} />
            <OriginTag url={action.url} />
          </>
        )}
        {isCall && (
          <button
            type="button"
            onClick={copyNumber}
            className="touch-target inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold text-muted ring-1 ring-line hover:text-ink"
          >
            {copy === "copied" ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
            {copy === "copied" ? T("copied") : T("copyNumber")}
          </button>
        )}
      </div>
      {thirdParty && (
        <p className="mt-2 px-1 text-[12px] text-muted">
          {tf("thirdPartyNote", { name: thirdPartyName(action.url) })}
        </p>
      )}
      {copy === "failed" && (
        <p role="alert" className="mt-1.5 px-1 text-[12px] font-semibold text-warning">
          {T("copyFailed")}
        </p>
      )}
    </li>
  );
}

export function ActionGrid({ actions }: { actions: ActionRecord[] }) {
  const { T } = useLocale();
  if (actions.length === 0) return null;
  const official = actions.filter((a) => linkOrigin(a.url) !== "third_party");
  const tools = actions.filter((a) => linkOrigin(a.url) === "third_party");
  return (
    <>
      {official.length > 0 && (
        <section aria-labelledby="actions-title" className="space-y-3">
          <h2 id="actions-title" className="text-lg font-extrabold tracking-tight text-ink">
            {T("officialActions")}
          </h2>
          <ul className="space-y-2.5">
            {official.map((a) => (
              <ActionCard key={a.id} action={a} />
            ))}
          </ul>
        </section>
      )}
      {tools.length > 0 && (
        <section aria-labelledby="tools-title" className="space-y-3">
          <h2 id="tools-title" className="text-lg font-extrabold tracking-tight text-ink">
            {T("thirdPartyActions")}
          </h2>
          <ul className="space-y-2.5">
            {tools.map((a) => (
              <ActionCard key={a.id} action={a} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
