import { effectiveStatus, isTrusted, pick, statusLabel, type Lang } from "../knowledge";
import { COPY, tf } from "../copy";
import type { Journey, JourneyState } from "./types";

export function formatPkr(amount: number): string {
  return `PKR ${amount.toLocaleString("en-US")}`;
}

/** Plain-text checklist for copy / share. Includes only trusted amounts, with their source. */
export function journeyToText(journey: Journey, state: JourneyState, lang: Lang): string {
  const lines: string[] = [];
  lines.push(
    `${pick(journey.serviceName, lang)} — ${journey.agencyName}, ${pick(journey.jurisdictionName, lang)}`,
  );
  lines.push(tf("readyPct", lang, { pct: journey.readiness.percent }));
  lines.push("");
  lines.push(COPY.requiredDocs[lang]);
  for (const r of journey.requirements.filter((x) => x.counts)) {
    const mark =
      state.checklist[r.record.id] === "ready"
        ? "✓"
        : state.checklist[r.record.id] === "attention"
          ? "!"
          : "○";
    lines.push(`${mark} ${pick(r.record.label, lang)}`);
  }

  const now = new Date();
  const trusted = journey.fees.shown.filter(
    (f) => f.amount !== null && isTrusted(effectiveStatus(f, now)),
  );
  if (trusted.length > 0) {
    lines.push("");
    lines.push(COPY.feesTitle[lang]);
    for (const f of trusted)
      lines.push(
        `• ${pick(f.label, lang)}: ${formatPkr(f.amount as number)} (${statusLabel(effectiveStatus(f, now), lang)})`,
      );
  }

  if (journey.sources.length > 0) {
    lines.push("");
    lines.push(COPY.sourcesTitle[lang]);
    for (const s of journey.sources.filter((x) => x.url.startsWith("https://")).slice(0, 5))
      lines.push(`• ${s.title}: ${s.url}`);
  }
  lines.push("");
  lines.push("Prepared with Raasta — confirm details at the official source before you go.");
  return lines.join("\n");
}
