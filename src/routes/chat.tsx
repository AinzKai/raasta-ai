import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Paperclip, ScanLine, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { askRaasta, type Roadmap } from "@/lib/assistant.functions";
import { checkDocument, type DocCheck } from "@/lib/documents.functions";
import { SERVICES, PRIMARY_SLUGS, getService } from "@/lib/knowledge";
import { Disclaimer, RouteSteps, ServiceIcon, SourceList, UnverifiedBadge } from "@/components/civic";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useLang, t } from "@/lib/i18n";

type Search = { q?: string; service?: string };

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search.q === "string" ? search.q : undefined,
    service: typeof search.service === "string" ? search.service : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ask Raasta AI — sourced answers for Pakistani paperwork" },
      {
        name: "description",
        content:
          "Describe your problem in Urdu, Roman Urdu or English and get a numbered checklist with documents, fees and offices — plus a document photo check.",
      },
      { property: "og:title", content: "Ask Raasta AI" },
      {
        property: "og:description",
        content: "Turn a civic-service problem into a sourced, step-by-step checklist.",
      },
    ],
  }),
  component: Chat,
});

type Turn =
  | { kind: "user"; text: string }
  | { kind: "answer"; data: Roadmap }
  | { kind: "doc"; data: DocCheck; preview: string };

function Chat() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [lang] = useLang();
  const { session } = useSession();
  const ask = useServerFn(askRaasta);
  const scan = useServerFn(checkDocument);

  const [service, setService] = useState<string | null>(search.service ?? null);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const conversationId = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  async function persist(role: "user" | "assistant", content: string, payload?: unknown) {
    if (!session) return;
    try {
      if (!conversationId.current) {
        const { data, error } = await supabase
          .from("conversations")
          .insert({
            user_id: session.user.id,
            service_slug: service,
            title: content.slice(0, 60) || "New request",
          })
          .select("id")
          .single();
        if (error) throw error;
        conversationId.current = data.id;
      }
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId.current,
        user_id: session.user.id,
        role,
        content,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
      });
      if (error) throw error;
    } catch (err) {
      console.error("Could not save this message", err);
    }
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setTurns((prev) => [...prev, { kind: "user", text: question }]);
    setBusy(true);
    void persist("user", question);

    try {
      const history = turns
        .flatMap((turn) =>
          turn.kind === "user"
            ? [{ role: "user" as const, content: turn.text }]
            : turn.kind === "answer"
              ? [{ role: "assistant" as const, content: JSON.stringify(turn.data).slice(0, 3500) }]
              : [],
        )
        .slice(-8);

      const data = await ask({ data: { question, serviceSlug: service, history } });
      setTurns((prev) => [...prev, { kind: "answer", data }]);
      if (data.service_slug && !service) setService(data.service_slug);
      void persist("assistant", data.title, data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
      composerRef.current?.focus();
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    if (search.q) {
      startedRef.current = true;
      void send(search.q);
      navigate({ to: "/chat", search: { service: search.service }, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q]);

  async function onFile(file: File) {
    if (file.size > 5_000_000) {
      toast.error("Please use a photo under 5 MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read the file"));
      reader.readAsDataURL(file);
    });

    setScanning(true);
    try {
      const data = await scan({ data: { serviceSlug: service, imageDataUrl: dataUrl } });
      setTurns((prev) => [...prev, { kind: "doc", data, preview: dataUrl }]);
      void persist("assistant", "Document check", data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not check that image");
    } finally {
      setScanning(false);
    }
  }

  const empty = turns.length === 0 && !busy;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 pb-6 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">Context</span>
        <button
          onClick={() => setService(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${
            service === null
              ? "bg-primary text-primary-foreground ring-primary"
              : "bg-surface text-muted ring-line"
          }`}
        >
          Anything
        </button>
        {SERVICES.filter((s) => PRIMARY_SLUGS.includes(s.slug)).map((s) => (
          <button
            key={s.slug}
            onClick={() => setService(s.slug)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${
              service === s.slug
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-surface text-muted ring-line"
            }`}
          >
            <ServiceIcon name={s.icon} className="size-3.5" />
            {s.name}
          </button>
        ))}
      </div>

      <div className="mt-6 flex-1 space-y-6">
        {empty && <EmptyState service={service} onPick={(q) => void send(q)} />}

        {turns.map((turn, i) =>
          turn.kind === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground">
                {turn.text}
              </p>
            </div>
          ) : turn.kind === "answer" ? (
            <RoadmapCard key={i} data={turn.data} onFollowup={(q) => void send(q)} />
          ) : (
            <DocCard key={i} data={turn.data} preview={turn.preview} />
          ),
        )}

        {(busy || scanning) && (
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Loader2 className="size-4 animate-spin" />
            {scanning ? "Reading your document…" : "Mapping your route…"}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-4 mt-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="rounded-3xl bg-surface p-2 shadow-lift ring-1 ring-line focus-within:ring-2 focus-within:ring-primary"
        >
          <textarea
            ref={composerRef}
            autoFocus
            value={input}
            rows={2}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={t("askPlaceholder", lang)}
            aria-label="Ask Raasta a question"
            className="max-h-40 w-full resize-none bg-transparent px-4 pt-3 text-[15px] outline-none placeholder:text-muted"
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold text-muted transition-colors hover:text-primary"
            >
              <Paperclip className="size-4" />
              Check a document
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              aria-label="Upload document photo"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted">
          Guidance only — confirm fees and requirements with the department before you pay.
          {!session && (
            <>
              {" "}
              <Link to="/auth" className="font-bold text-primary">
                Sign in
              </Link>{" "}
              to save your roadmaps.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ service, onPick }: { service: string | null; onPick: (q: string) => void }) {
  const genericExamples = [
    "Mera CNIC expire ho gaya, renew kaise karun?",
    "Passport renewal me kitna time lagta hai?",
    "میں نے اسلام آباد میں گاڑی خریدی ہے، ٹرانسفر کیسے ہوگا؟",
    "What documents do I need for a police character certificate?",
  ];
  const selected = getService(service);
  const examples = selected?.scenarios?.length ? selected.scenarios : genericExamples;

  return (
    <div className="rounded-3xl bg-surface p-8 ring-1 ring-line">
      <span className="grid size-11 place-items-center rounded-2xl bg-primary-tint text-primary">
        <Sparkles className="size-5" />
      </span>
      <h1 className="mt-4 text-xl font-extrabold tracking-tight">
        {selected ? `Common ${selected.name.toLowerCase()} situations` : "Tell Raasta your problem, in any language"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        You'll get a numbered route: what to bring, where to go, what it costs, and what people
        most often get wrong. Confirmed fees carry a source; anything unconfirmed says so.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        {examples.map((example) => (
          <button
            key={example}
            onClick={() => onPick(example)}
            className="rounded-2xl bg-paper px-4 py-3 text-left text-sm font-medium ring-1 ring-line transition-colors hover:ring-primary/40"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}

function RoadmapCard({ data, onFollowup }: { data: Roadmap; onFollowup: (q: string) => void }) {
  const service = getService(data.service_slug);
  const urdu = data.language === "ur";

  return (
    <article className={`rounded-3xl bg-surface p-6 ring-1 ring-line ${urdu ? "urdu" : ""}`}>
      <h2 className="text-lg font-extrabold tracking-tight">{data.title}</h2>
      {data.intro && <p className="mt-2 text-sm leading-relaxed text-muted">{data.intro}</p>}

      {data.clarifying_question && (
        <button
          onClick={() => onFollowup(data.clarifying_question as string)}
          className="mt-4 w-full rounded-2xl bg-primary-tint px-4 py-3 text-left text-sm font-semibold text-primary"
        >
          {data.clarifying_question}
        </button>
      )}

      {data.documents.length > 0 && (
        <section className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted">What to bring</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {data.documents.map((doc, i) => (
              <li key={i} className="rounded-2xl bg-paper px-3.5 py-2.5 text-sm ring-1 ring-line">
                {doc}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.steps.length > 0 && (
        <section className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Your route</h3>
          <RouteSteps steps={data.steps} />
        </section>
      )}

      {data.fees.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Fees</h3>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
            {data.fees.map((fee, i) => (
              <li key={i} className="flex items-start justify-between gap-4 bg-paper px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{fee.label}</p>
                  {fee.note && <p className="mt-1 text-xs text-muted">{fee.note}</p>}
                </div>
                {fee.unverified || fee.amount_pkr === null ? (
                  <UnverifiedBadge />
                ) : (
                  <span className="whitespace-nowrap text-sm font-bold">
                    PKR {fee.amount_pkr.toLocaleString("en-PK")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {data.warnings.map((warning, i) => (
            <Disclaimer key={i}>{warning}</Disclaimer>
          ))}
        </div>
      )}

      {data.sources.length > 0 && (
        <section className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Sources</h3>
          <div className="mt-2">
            <SourceList sources={data.sources} />
          </div>
        </section>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {data.followups.slice(0, 3).map((followup, i) => (
          <button
            key={i}
            onClick={() => onFollowup(followup)}
            className="rounded-full bg-paper px-3.5 py-2 text-xs font-semibold text-muted ring-1 ring-line hover:text-primary"
          >
            {followup}
          </button>
        ))}
        {service && (
          <Link
            to="/services/$slug"
            params={{ slug: service.slug }}
            className="rounded-full bg-primary-tint px-3.5 py-2 text-xs font-bold text-primary"
          >
            Full {service.name} page
          </Link>
        )}
      </div>
    </article>
  );
}

function DocCard({ data, preview }: { data: DocCheck; preview: string }) {
  const [open, setOpen] = useState(true);
  const tone =
    data.readable === "good"
      ? "text-primary bg-primary-tint"
      : "text-warning bg-warning-tint";

  return (
    <article className="rounded-3xl bg-surface p-6 ring-1 ring-line">
      <div className="flex items-start gap-4">
        {open && (
          <div className="relative">
            <img
              src={preview}
              alt="Uploaded document preview"
              className="size-20 rounded-2xl object-cover ring-1 ring-line"
            />
            <button
              onClick={() => setOpen(false)}
              className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-ink text-paper"
              aria-label="Hide preview"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        <div className="flex-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            <ScanLine className="size-3.5" />
            Document check
          </span>
          <h2 className="mt-1.5 text-base font-extrabold tracking-tight">{data.looks_like}</h2>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>
            Legibility: {data.readable}
          </span>
        </div>
      </div>

      {data.observations.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm text-muted">
          {data.observations.map((o, i) => (
            <li key={i}>• {o}</li>
          ))}
        </ul>
      )}

      {data.possible_problems.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {data.possible_problems.map((p, i) => (
            <li key={i} className="rounded-2xl bg-warning-tint px-3.5 py-2.5 text-sm text-warning">
              {p}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-sm font-semibold">{data.next_step}</p>

      <div className="mt-4">
        <Disclaimer>
          This is a visual read of your photo only. Raasta cannot confirm that a document is
          genuine, valid or acceptable to any department.
        </Disclaimer>
      </div>
    </article>
  );
}
