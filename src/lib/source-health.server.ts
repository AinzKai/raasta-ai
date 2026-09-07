/**
 * Source health check engine — validates that every URL in the knowledge base
 * is still reachable. Runs as a scheduled Cloudflare Cron Trigger or via an
 * authenticated HTTP endpoint.
 *
 * Only uses service_role (supabaseAdmin) to write results. Reads are public
 * via RLS on the source_health table.
 */
import { SERVICES } from "@/lib/knowledge";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type HealthResult = {
  service_slug: string;
  source_url: string;
  status: "ok" | "error" | "timeout";
  http_status: number | null;
  error_message: string | null;
};

const TIMEOUT_MS = 15_000;
const USER_AGENT = "RaastaAI-HealthCheck/1.0 (https://raasta.ai)";

async function checkUrl(url: string): Promise<{ ok: boolean; status: number | null; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const method = url.startsWith("tel:") ? "HEAD" : "GET";
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    clearTimeout(timeout);

    return { ok: res.ok, status: res.status, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return { ok: false, status: null, error: isTimeout ? "timeout" : msg };
  }
}

export async function runSourceHealthCheck(): Promise<HealthResult[]> {
  const results: HealthResult[] = [];

  for (const service of SERVICES) {
    for (const source of service.sources) {
      const { ok, status, error } = await checkUrl(source.url);
      results.push({
        service_slug: service.slug,
        source_url: source.url,
        status: ok ? "ok" : error === "timeout" ? "timeout" : "error",
        http_status: status,
        error_message: error,
      });
    }
  }

  if (results.length > 0) {
    const { error } = await supabaseAdmin.from("source_health").insert(
      results.map((r) => ({
        service_slug: r.service_slug,
        source_url: r.source_url,
        status: r.status,
        http_status: r.http_status,
        error_message: r.error_message,
      })),
    );
    if (error) {
      console.error("source_health_insert_failed", error.message);
    }
  }

  const failures = results.filter((r) => r.status !== "ok");
  if (failures.length > 0) {
    console.warn("source_health_failures", JSON.stringify(failures));
  }

  return results;
}
