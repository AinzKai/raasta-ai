import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Layered, fail-closed rate limiting for every endpoint that costs money.
 *
 * Layers per request: per-minute and per-day, for the IP and (when the
 * caller is signed in) for the user. Signed-in users get higher caps than
 * anonymous callers. If the database counter is unavailable we do NOT fail
 * open: we fall back to a strict in-memory limiter, so an infrastructure
 * failure cannot become unlimited AI spend.
 */

export type Endpoint = "chat" | "document" | "explain";

type Caps = { perMinute: number; perDay: number };
type Tier = { anonymous: Caps; user: Caps };

export const LIMITS: Record<Endpoint, Tier> = {
  chat: { anonymous: { perMinute: 8, perDay: 60 }, user: { perMinute: 15, perDay: 250 } },
  document: { anonymous: { perMinute: 3, perDay: 8 }, user: { perMinute: 6, perDay: 30 } },
  explain: { anonymous: { perMinute: 4, perDay: 20 }, user: { perMinute: 8, perDay: 80 } },
};

/** Per-isolate budget when the shared counter cannot be reached. Deliberately tight. */
export const FALLBACK_PER_MINUTE: Record<Endpoint, number> = { chat: 4, document: 1, explain: 2 };

export class RateLimitError extends Error {
  constructor(
    public scope: "minute" | "day" | "unavailable" = "minute",
    public retryAfterSec = 60,
  ) {
    super(
      scope === "day"
        ? "Too many requests today — please come back tomorrow."
        : scope === "unavailable"
          ? "Too many requests — Raasta is rate-limiting while its usage counter recovers. Try again shortly."
          : "Too many requests — please wait a moment and try again.",
    );
    this.name = "RateLimitError";
  }
}

export type LimiterDeps = {
  /** Atomically increment a bucket and return its new count. Throws if unavailable. */
  increment: (bucketKey: string) => Promise<number>;
  now: () => number;
  fallback: Map<string, { count: number; windowId: number }>;
};

export type Caller = { ip: string | null; userId: string | null };

export async function checkRateLimit(
  endpoint: Endpoint,
  caller: Caller,
  deps: LimiterDeps,
): Promise<void> {
  const tier = LIMITS[endpoint];
  const caps = caller.userId ? tier.user : tier.anonymous;
  const minute = Math.floor(deps.now() / 60_000);
  const day = new Date(deps.now()).toISOString().slice(0, 10);

  // A caller we cannot identify shares one strict bucket; stripping headers must not help.
  const ipKey = caller.ip ?? "unknown";
  const checks: Array<{ key: string; cap: number; scope: "minute" | "day" }> = [
    { key: `${endpoint}:ip:${ipKey}:m:${minute}`, cap: caps.perMinute, scope: "minute" },
    { key: `${endpoint}:ip:${ipKey}:d:${day}`, cap: caps.perDay, scope: "day" },
  ];
  if (caller.userId) {
    checks.push(
      {
        key: `${endpoint}:user:${caller.userId}:m:${minute}`,
        cap: caps.perMinute,
        scope: "minute",
      },
      { key: `${endpoint}:user:${caller.userId}:d:${day}`, cap: caps.perDay, scope: "day" },
    );
  }

  try {
    for (const c of checks) {
      const count = await deps.increment(c.key);
      if (count > c.cap) throw new RateLimitError(c.scope, c.scope === "day" ? 3600 : 60);
    }
  } catch (e) {
    if (e instanceof RateLimitError) throw e;
    console.error("rate_limit_counter_unavailable", e instanceof Error ? e.message : e);
    // Fail CLOSED to a strict in-memory budget rather than open.
    const key = `${endpoint}:${caller.userId ?? ipKey}`;
    const entry = deps.fallback.get(key);
    const next = entry && entry.windowId === minute ? entry.count + 1 : 1;
    deps.fallback.set(key, { count: next, windowId: minute });
    if (next > FALLBACK_PER_MINUTE[endpoint]) throw new RateLimitError("unavailable", 60);
  }
}

// ----------------------------------------------------------------- runtime ---

const fallbackStore: LimiterDeps["fallback"] = new Map();

async function incrementInDb(bucketKey: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("increment_rate_limit", {
    p_bucket_key: bucketKey,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== "number") throw new Error("rate limit RPC returned no count");
  return data;
}

/** The signed-in user for this request, verified server-side — never trusted from the client body. */
export async function getOptionalUserId(): Promise<string | null> {
  try {
    const header = getRequestHeader("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    return error ? null : (data.user?.id ?? null);
  } catch {
    return null;
  }
}

/** Call first thing in any server function that spends AI budget. Returns the verified caller. */
export async function enforceRateLimit(endpoint: Endpoint): Promise<Caller> {
  let ip: string | null = null;
  try {
    ip = getRequestIP({ xForwardedFor: true }) ?? null;
  } catch {
    ip = null;
  }
  const caller: Caller = { ip, userId: await getOptionalUserId() };
  await checkRateLimit(endpoint, caller, {
    increment: incrementInDb,
    now: Date.now,
    fallback: fallbackStore,
  });

  if (Math.random() < 0.02) {
    supabaseAdmin.rpc("cleanup_old_rate_limits").then(
      () => {},
      (e) => console.error("rate_limit_cleanup_failed", e),
    );
  }
  return caller;
}
