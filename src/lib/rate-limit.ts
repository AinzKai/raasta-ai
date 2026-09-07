import { getRequestIP } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WINDOW_MS = 60_000; // 1-minute fixed windows

// Requests allowed per IP per minute, per endpoint. Chat is cheaper per call
// than document analysis (which sends an image), so it gets a higher limit.
const LIMITS: Record<string, number> = {
  chat: 12,
  document: 6,
};

export class RateLimitError extends Error {
  constructor() {
    super("Too many requests — please wait a moment and try again.");
    this.name = "RateLimitError";
  }
}

/**
 * Throws RateLimitError if the caller (identified by IP) has exceeded the
 * limit for this endpoint in the current 1-minute window. Call this as the
 * very first thing in a server function handler, before doing any AI call.
 *
 * Fails open (allows the request) if the IP can't be determined or the rate
 * limit check itself errors — a rate limiter that takes down the whole app
 * when it has a bug is worse than one that occasionally under-throttles.
 */
export async function enforceRateLimit(endpoint: string): Promise<void> {
  const limit = LIMITS[endpoint] ?? 10;

  let ip: string | undefined;
  try {
    ip = getRequestIP({ xForwardedFor: true });
  } catch {
    return; // no request context (e.g. test/script call) — allow it
  }
  if (!ip) return;

  const windowId = Math.floor(Date.now() / WINDOW_MS);
  const bucketKey = `${endpoint}:${ip}:${windowId}`;

  try {
    const { data, error } = await supabaseAdmin.rpc("increment_rate_limit", {
      p_bucket_key: bucketKey,
    });
    if (error) {
      console.error("rate_limit_check_failed", error.message);
      return; // fail open
    }
    if (typeof data === "number" && data > limit) {
      throw new RateLimitError();
    }
  } catch (e) {
    if (e instanceof RateLimitError) throw e;
    console.error("rate_limit_check_error", e);
    return; // fail open
  }

  // ~2% of requests also trigger a cleanup of old buckets — cheap, avoids
  // needing a separate cron job for a table this small.
  if (Math.random() < 0.02) {
    supabaseAdmin.rpc("cleanup_old_rate_limits").then(
      () => {},
      (e) => console.error("rate_limit_cleanup_failed", e),
    );
  }
}
