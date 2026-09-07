import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { checkHealth, type HealthStatus } from "@/lib/health.functions";
import { useLang, t } from "@/lib/i18n";

export const Route = createFileRoute("/status")({
  head: () => ({ meta: [{ title: "Status — Raasta AI" }] }),
  component: StatusPage,
});

function Row({ label, ok, detail, lang }: { label: string; ok: boolean; detail: string; lang: "en" | "ur" }) {
  return (
    <div className={`flex items-center justify-between border-b border-border py-3 last:border-0 ${lang === "ur" ? "flex-row-reverse" : ""}`}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className={`flex items-center gap-1.5 text-sm ${ok ? "text-primary" : "text-destructive"}`}>
        {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        {detail}
      </span>
    </div>
  );
}

function StatusPage() {
  const check = useServerFn(checkHealth);
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang] = useLang();

  const run = () => {
    setLoading(true);
    check()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  };

  useEffect(run, []);

  return (
    <div className={`mx-auto max-w-md px-4 py-16 ${lang === "ur" ? "urdu text-right" : ""}`}>
      <h1 className="mb-1 text-xl font-extrabold text-foreground">{t("systemStatus", lang)}</h1>
      <p className="mb-6 text-sm text-muted">{t("systemStatusSub", lang)}</p>

      <div className="rounded-2xl border border-border bg-white p-5">
        {loading && (
          <div className={`flex items-center gap-2 py-6 text-sm text-muted ${lang === "ur" ? "flex-row-reverse" : ""}`}>
            <Loader2 size={16} className="animate-spin" /> {t("checking", lang)}
          </div>
        )}
        {!loading && status && (
          <>
            <Row label={t("database", lang)} ok={status.database === "ok"} detail={status.database} lang={lang} />
            <Row
              label={t("aiProvider", lang)}
              ok={status.aiProvider !== "none"}
              detail={status.aiProvider === "none" ? t("notConfigured", lang) : status.aiProvider}
              lang={lang}
            />
            <p className="mt-4 text-xs text-muted">{t("lastChecked", lang)} {new Date(status.timestamp).toLocaleTimeString()}</p>
          </>
        )}
        {!loading && !status && (
          <p className="text-sm text-destructive">{t("serverUnreachable", lang)}</p>
        )}
      </div>

      <button
        onClick={run}
        className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-primary-tint"
      >
        {t("recheck", lang)}
      </button>
    </div>
  );
}
