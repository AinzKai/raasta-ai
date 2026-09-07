import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Handle cron-triggered source health checks
    const url = new URL(request.url);
    if (url.pathname === "/api/cron/check-sources" && request.method === "GET") {
      const authResponse = await authenticateCronRequest(request);
      if (authResponse) return authResponse;

      try {
        const { runSourceHealthCheck } = await import("./lib/source-health.server");
        const results = await runSourceHealthCheck();
        return new Response(JSON.stringify({ ok: true, checked: results.length }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        console.error("cron_check_sources_failed", error);
        return new Response(JSON.stringify({ ok: false, error: String(error) }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },

  // Cloudflare Cron Trigger handler
  async scheduled(event: unknown, env: unknown, ctx: unknown) {
    try {
      const { runSourceHealthCheck } = await import("./lib/source-health.server");
      const results = await runSourceHealthCheck();
      console.log("cron_source_health_completed", results.length, "sources checked");
    } catch (error) {
      console.error("cron_source_health_failed", error);
    }
  },
};
