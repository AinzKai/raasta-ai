import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, MessageSquare } from "lucide-react";

import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { SERVICES } from "@/lib/knowledge";
import { ServiceIcon } from "@/components/civic";
import { useLang, t } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My requests — Raasta AI" }] }),
  component: AccountPage,
});

type ConversationRow = {
  id: string;
  service_slug: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

function AccountPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [lang] = useLang();
  const [conversations, setConversations] = useState<ConversationRow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openMessages, setOpenMessages] = useState<MessageRow[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth" });
      return;
    }
    supabase
      .from("conversations")
      .select("id, service_slug, title, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          toast.error(t("loadingError", lang));
          return;
        }
        setConversations(data ?? []);
      });
  }, [session, loading, navigate, lang]);

  const handleOpen = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      setOpenMessages(null);
      return;
    }
    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(t("conversationLoadError", lang));
      return;
    }
    setOpenId(id);
    setOpenMessages(data ?? []);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t("deleteRequestConfirm", lang))) return;
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) {
      toast.error(t("deleteRequestError", lang));
      return;
    }
    setConversations((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    if (openId === id) {
      setOpenId(null);
      setOpenMessages(null);
    }
  };

  return (
    <div className={`mx-auto max-w-2xl px-4 py-10 ${lang === "ur" ? "urdu text-right" : ""}`}>
      <h1 className="mb-1 text-2xl font-extrabold text-foreground">{t("myRequests", lang)}</h1>
      <p className="mb-6 text-sm text-muted">{t("myRequestsSub", lang)}</p>

      {conversations === null && <p className="text-sm text-muted">{t("loadingRequests", lang)}</p>}

      {conversations?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted">{t("noRequests", lang)}</p>
          <Link to="/chat" className="mt-3 inline-block text-sm font-semibold text-primary">
            {t("startNewRequest", lang)}
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {conversations?.map((conv) => {
          const service = SERVICES.find((s) => s.slug === conv.service_slug);
          const isOpen = openId === conv.id;
          return (
            <div key={conv.id} className="overflow-hidden rounded-xl border border-border bg-white">
              <button
                onClick={() => handleOpen(conv.id)}
                className={`flex w-full items-center gap-3 p-4 transition-colors hover:bg-primary-tint/40 ${lang === "ur" ? "text-right" : "text-left"}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
                  {service ? <ServiceIcon name={service.icon} className="size-4" /> : <MessageSquare size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{conv.title}</p>
                  <p className="text-xs text-muted">
                    {service?.name ?? t("generalService", lang)} · {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="p-2 text-muted transition-colors hover:text-destructive"
                  aria-label="Delete this request"
                >
                  <Trash2 size={15} />
                </button>
              </button>

              {isOpen && openMessages && (
                <div className="space-y-2 border-t border-border bg-primary-tint/20 p-4">
                  {openMessages.map((m) => (
                    <div key={m.id} className={`text-sm ${m.role === "user" ? "text-right" : "text-left"}`}>
                      <span
                        className={`inline-block max-w-[85%] rounded-lg px-3 py-1.5 ${
                          m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-white"
                        }`}
                      >
                        {m.content}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
