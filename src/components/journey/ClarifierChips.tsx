import type { Clarifier } from "@/lib/knowledge";
import { pick } from "@/lib/knowledge";
import { useLocale } from "@/lib/i18n";

/** Interactive answer chips. Rendered as a labelled group of real buttons. */
export function ClarifierChips({
  clarifier,
  onAnswer,
  hint,
}: {
  clarifier: Clarifier;
  onAnswer: (key: string, value: string) => void;
  hint?: string;
}) {
  const { lang } = useLocale();
  const id = `clarifier-${clarifier.key}`;
  return (
    <div role="group" aria-labelledby={id} className="space-y-2">
      <p id={id} className="text-sm font-bold text-ink">
        {pick(clarifier.question, lang)}
      </p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {clarifier.options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onAnswer(clarifier.key, o.value)}
            className="touch-target rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-primary-tint hover:text-primary hover:ring-primary/40"
          >
            {pick(o.label, lang)}
          </button>
        ))}
      </div>
    </div>
  );
}
