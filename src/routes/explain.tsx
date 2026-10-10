import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { explainText, type ExplainResponse } from "@/lib/explain.functions";
import { useLocale } from "@/lib/i18n";
import type { Lang } from "@/lib/knowledge";

export const Route = createFileRoute("/explain")({
  head: () => ({ meta: [{ title: "Explain this instruction — Raasta" }] }),
  component: Explain,
});

function Explain() {
  const { lang, T } = useLocale();
  const [text, setText] = useState("");
  const [target, setTarget] = useState<Lang>(lang);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [failed, setFailed] = useState(false);

  async function run() {
    setBusy(true);
    setFailed(false);
    setResult(null);
    try {
      setResult(await explainText({ data: { text, language: target } }));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const options: Array<{ value: Lang; label: string }> = [
    { value: "en", label: T("langEn") },
    { value: "ur", label: T("langUr") },
    { value: "roman", label: T("langRoman") },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{T("explainTitle")}</h1>
        <p className="mt-1 text-muted">{T("explainSub")}</p>
      </header>

      <div className="space-y-4 rounded-3xl bg-surface p-5 ring-1 ring-line">
        <label className="block">
          <span className="text-sm font-bold text-ink">{T("pasteHere")}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            maxLength={4000}
            className="mt-2 w-full rounded-2xl border border-line bg-paper p-3 text-base text-ink focus-visible:outline-primary"
          />
        </label>
        <fieldset>
          <legend className="text-sm font-bold text-ink">{T("explainIn")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((o) => (
              <label
                key={o.value}
                className={`touch-target inline-flex cursor-pointer items-center rounded-full px-4 py-2 text-sm font-semibold ring-1 ${target === o.value ? "bg-primary text-primary-foreground ring-primary" : "bg-paper text-ink ring-line"}`}
              >
                <input
                  type="radio"
                  name="explain-lang"
                  value={o.value}
                  checked={target === o.value}
                  onChange={() => setTarget(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || text.trim().length < 20}
          className="touch-target inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {T("explainButton")}
        </button>
      </div>

      <div aria-live="polite">
        {failed && (
          <div role="alert" className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <p className="font-bold text-ink">{T("errorTitle")}</p>
            <p className="text-sm text-muted">{T("explainUnavailable")}</p>
          </div>
        )}
        {result && !result.ok && (
          <div role="status" className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <p className="font-bold text-ink">{T("notVerifiedTitle")}</p>
            <p className="text-sm text-muted">
              {result.reason === "unavailable" ? T("explainUnavailable") : T("explainRejected")}
            </p>
          </div>
        )}
        {result?.ok && (
          <section
            className="space-y-3 rounded-3xl bg-primary-tint/60 p-5 ring-1 ring-primary/15"
            lang={result.language === "ur" ? "ur" : "en"}
            dir={result.language === "ur" ? "rtl" : "ltr"}
          >
            <h2 className="text-lg font-extrabold text-ink">{T("inSimpleWords")}</h2>
            <ol className="list-decimal space-y-2 ps-5 text-base text-ink">
              {result.steps.map((s, i) => (
                <li key={i} className={result.language === "ur" ? "urdu" : ""}>
                  {s}
                </li>
              ))}
            </ol>
            <p className="text-[12px] text-muted">{T("explainGrounded")}</p>
          </section>
        )}
      </div>
    </div>
  );
}
