import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type HealthStatus = {
  ok: boolean;
  database: "ok" | "error";
  aiProvider: "qwen" | "gemini" | "none";
  timestamp: string;
};

export const checkHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<HealthStatus> => {
    let database: "ok" | "error" = "error";
    try {
      const { error } = await supabaseAdmin.from("rate_limits").select("bucket_key").limit(1);
      database = error ? "error" : "ok";
    } catch {
      database = "error";
    }

    const aiProvider = process.env["QWEN_API_KEY"] || process.env["DASHSCOPE_API_KEY"]
      ? "qwen"
      : process.env["GEMINI_API_KEY"]
        ? "gemini"
        : "none";

    return {
      ok: database === "ok" && aiProvider !== "none",
      database,
      aiProvider,
      timestamp: new Date().toISOString(),
    };
  },
);
