import { ArrowRight } from "lucide-react";
import { useId, type FormEvent } from "react";

import { useLocale } from "@/lib/i18n";

/** The "what are you trying to get done?" input. A real form with a real label. */
export function GoalInput({
  value,
  onChange,
  onSubmit,
  disabled,
  autoFocus,
  large,
  buttonLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  large?: boolean;
  buttonLabel?: string;
}) {
  const { T } = useLocale();
  const id = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (value.trim().length >= 2 && !disabled) onSubmit();
  }

  return (
    <form onSubmit={submit} className="w-full">
      <label htmlFor={id} className="sr-only">
        {T("goalLabel")}
      </label>
      <div
        className={`flex flex-col gap-2 rounded-3xl bg-surface p-2 shadow-lift ring-1 ring-line focus-within:ring-2 focus-within:ring-primary sm:flex-row sm:items-center ${large ? "sm:p-2.5" : ""}`}
      >
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (value.trim().length >= 2 && !disabled) onSubmit();
            }
          }}
          rows={large ? 2 : 1}
          maxLength={1500}
          autoFocus={autoFocus}
          placeholder={T("goalPlaceholder")}
          className={`min-h-12 w-full flex-1 resize-none bg-transparent px-3 py-2.5 text-ink placeholder:text-muted/70 focus:outline-none ${large ? "text-lg" : "text-base"}`}
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length < 2}
          className="touch-target inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {buttonLabel ?? T("startJourney")}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
        </button>
      </div>
    </form>
  );
}
