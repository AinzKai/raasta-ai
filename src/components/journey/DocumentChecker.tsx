import { useRef, useState } from "react";
import { FileImage, Loader2, ShieldAlert, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { checkDocument } from "@/lib/documents.functions";
import type { DocCheck } from "@/lib/doc-check";
import { prepareImage } from "@/lib/image";
import { useLocale } from "@/lib/i18n";

type Phase = "idle" | "preparing" | "checking" | "done" | "error";

/**
 * Visual sanity check. Explicit consent before any upload; the photo is
 * re-encoded locally (stripping location metadata) and never stored by Raasta.
 */
export function DocumentChecker({ serviceSlug }: { serviceSlug: string | null }) {
  const { T } = useLocale();
  const [phase, setPhase] = useState<Phase>("idle");
  const [pending, setPending] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DocCheck | null>(null);
  const run = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    run.current++;
    setPhase("idle");
    setPending(null);
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function confirm() {
    const file = pending;
    setPending(null);
    if (!file) return;
    const id = ++run.current;
    try {
      setPhase("preparing");
      const dataUrl = await prepareImage(file);
      if (id !== run.current) return;
      setPreview(dataUrl);
      setPhase("checking");
      const res = await checkDocument({ data: { serviceSlug, imageDataUrl: dataUrl } });
      if (id !== run.current) return;
      setResult(res);
      setPhase("done");
    } catch {
      if (id === run.current) setPhase("error");
    }
  }

  const readableLabel = result
    ? { good: T("docGood"), poor: T("docPoor"), unreadable: T("docUnreadable") }[result.readable]
    : "";

  return (
    <section aria-labelledby="doc-title" className="rounded-3xl bg-surface p-5 ring-1 ring-line">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-tint text-primary">
          <FileImage className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="doc-title" className="text-lg font-extrabold tracking-tight text-ink">
            {T("docTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">{T("docSub")}</p>
        </div>
      </div>

      <p className="mt-4 flex gap-2 rounded-2xl bg-source-tint p-3 text-[13px] text-ink">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-source" aria-hidden />
        {T("docBoundary")}
      </p>

      {phase === "idle" && (
        <label className="touch-target mt-4 inline-flex cursor-pointer items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
          {T("docChoose")}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPending(f);
            }}
          />
        </label>
      )}

      {(phase === "preparing" || phase === "checking") && (
        <div role="status" className="mt-4 flex items-center gap-3 text-sm font-semibold text-ink">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
          {phase === "preparing" ? T("docPreparing") : T("docChecking")}
          <button
            type="button"
            onClick={reset}
            className="touch-target ms-auto text-sm font-semibold text-muted underline"
          >
            {T("cancel")}
          </button>
        </div>
      )}

      {phase === "error" && (
        <div role="alert" className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-warning">{T("docError")}</p>
          <button
            type="button"
            onClick={reset}
            className="touch-target rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-line"
          >
            {T("tryAgain")}
          </button>
        </div>
      )}

      {phase === "done" && result && (
        <div className="mt-4 space-y-4 animate-rise-in">
          <div className="flex items-start gap-3">
            {preview && (
              <img
                src={preview}
                alt=""
                className="size-20 rounded-xl object-cover ring-1 ring-line"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">{result.looks_like}</p>
              <p className="text-sm text-muted">
                {T("docReadable")}: <span className="font-semibold text-ink">{readableLabel}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              aria-label={T("docRemoveImage")}
              className="touch-target grid place-items-center rounded-full text-muted ring-1 ring-line"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          {result.observations.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink">{T("docObservations")}</h3>
              <ul className="mt-1 list-disc space-y-1 ps-5 text-sm text-muted">
                {result.observations.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}
          {result.possible_problems.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink">{T("docProblems")}</h3>
              <ul className="mt-1 list-disc space-y-1 ps-5 text-sm text-warning">
                {result.possible_problems.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-2xl bg-primary-tint p-3 text-sm text-ink">
            <p className="font-bold">{T("docNext")}</p>
            <p className="mt-1">{result.next_step}</p>
          </div>
          <p className="text-[12px] text-muted">{result.boundary}</p>
        </div>
      )}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T("docTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{T("docPrivacy")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPending(null)}>{T("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>{T("docConsent")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
