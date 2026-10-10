import { Download } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import type { ActionRecord, RequirementRecord } from "@/lib/knowledge";
import { pick } from "@/lib/knowledge";
import type { ChecklistStatus, Journey, JourneyRequirement } from "@/lib/journey";
import { useLocale } from "@/lib/i18n";
import { TrustBadge } from "./trust";

const OPTIONS: Array<{
  value: ChecklistStatus;
  key: "markReady" | "markAttention" | "markUnavailable";
  tone: string;
}> = [
  { value: "ready", key: "markReady", tone: "bg-primary text-primary-foreground" },
  { value: "attention", key: "markAttention", tone: "bg-warning text-primary-foreground" },
  { value: "unavailable", key: "markUnavailable", tone: "bg-ink text-primary-foreground" },
];

function Item({
  item,
  action,
  onSet,
  onApplies,
}: {
  item: JourneyRequirement;
  action: ActionRecord | undefined;
  onSet: (id: string, status: ChecklistStatus | null) => void;
  onApplies: (id: string, applies: boolean) => void;
}) {
  const { lang, T, tf } = useLocale();
  const rec: RequirementRecord = item.record;
  const optional = !rec.required;
  const active = !optional || item.counts;
  const label = pick(rec.label, lang);

  return (
    <li className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{label}</p>
          {rec.detail && <p className="mt-1 text-[13px] text-muted">{pick(rec.detail, lang)}</p>}
        </div>
        <TrustBadge record={rec} />
      </div>

      {optional && (
        <label className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Switch
            checked={item.counts}
            onCheckedChange={(v) => onApplies(rec.id, v)}
            aria-label={`${T("appliesToMe")}: ${label}`}
          />
          {T("appliesToMe")}
        </label>
      )}

      {active && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={tf("setStatusFor", { item: label })}
            className="flex flex-wrap gap-1.5"
          >
            {OPTIONS.map((o) => {
              const pressed = item.status === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onSet(rec.id, pressed ? null : o.value)}
                  className={`touch-target rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 transition-colors ${
                    pressed
                      ? `${o.tone} ring-transparent`
                      : "bg-paper text-muted ring-line hover:text-ink"
                  }`}
                >
                  {T(o.key)}
                </button>
              );
            })}
          </div>
          {action && (
            <a
              href={action.url}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary-tint"
            >
              <Download className="size-3.5" aria-hidden />
              {pick(action.label, lang)}
            </a>
          )}
        </div>
      )}
    </li>
  );
}

export function Checklist({
  journey,
  onSet,
  onApplies,
}: {
  journey: Journey;
  onSet: (id: string, status: ChecklistStatus | null) => void;
  onApplies: (id: string, applies: boolean) => void;
}) {
  const { T } = useLocale();
  const actionFor = (r: RequirementRecord) =>
    r.actionId ? journey.actions.find((a) => a.id === r.actionId) : undefined;
  const required = journey.requirements.filter((r) => r.record.required);
  const optional = journey.requirements.filter((r) => !r.record.required);

  return (
    <section id="checklist" aria-labelledby="checklist-title" className="scroll-mt-24 space-y-3">
      <h2 id="checklist-title" className="text-lg font-extrabold tracking-tight text-ink">
        {T("requiredDocs")}
      </h2>
      <ul className="space-y-3">
        {required.map((item) => (
          <Item
            key={item.record.id}
            item={item}
            action={actionFor(item.record)}
            onSet={onSet}
            onApplies={onApplies}
          />
        ))}
      </ul>

      {optional.length > 0 && (
        <details className="group rounded-2xl ring-1 ring-line open:bg-paper/60">
          <summary className="touch-target flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-ink">
            {T("ifApplies")}
            <span className="text-xs font-semibold text-muted">{optional.length}</span>
          </summary>
          <ul className="space-y-3 p-3 pt-0">
            {optional.map((item) => (
              <Item
                key={item.record.id}
                item={item}
                action={actionFor(item.record)}
                onSet={onSet}
                onApplies={onApplies}
              />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
