/**
 * Scheduled source monitoring (the original daily source-health job, upgraded).
 *
 * It fetches ONLY the sources registered in the knowledge layer, honours
 * robots.txt, spaces requests out, records reachability, hashes normalized
 * content, detects meaningful change and creates REVIEW CANDIDATES.
 *
 * It never edits trusted knowledge. Reachable != changed != verified.
 */
import { callAI } from "@/lib/ai";
import {
  runMonitor,
  type FetchResult,
  type MonitorDeps,
  type MonitorSummary,
} from "@/lib/freshness/monitor";
import { BOT_NAME } from "@/lib/freshness/robots";
import { monitorStore } from "@/lib/knowledge-store.server";
import { sha256Hex } from "@/lib/source-change";

const TIMEOUT_MS = 15_000;
const MAX_TEXT = 1_500_000;
const MAX_BINARY = 5_000_000;
const USER_AGENT = `${BOT_NAME}/2.0 (+https://raasta.ai; knowledge-freshness monitor for registered official sources)`;

async function fetchPage(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain,*/*;q=0.5" },
    });
    if (!res.ok) {
      // 429/5xx are worth a polite retry; other 4xx (403, 404…) are not — and we never work around a 403.
      return {
        ok: false,
        status: res.status,
        error: `http_${res.status}`,
        retryable: res.status === 429 || res.status >= 500,
      };
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (/text\/(html|plain)/i.test(contentType)) {
      return {
        ok: true,
        status: res.status,
        text: (await res.text()).slice(0, MAX_TEXT),
        contentType,
        finalUrl: res.url || url,
      };
    }
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_BINARY)
      return {
        ok: true,
        status: res.status,
        text: `binary:oversize:${bytes.byteLength}`,
        contentType,
        finalUrl: res.url || url,
      };
    const digest = await sha256Hex(Array.from(new Uint8Array(bytes.slice(0, 65_536))).join(","));
    return {
      ok: true,
      status: res.status,
      text: `binary:${bytes.byteLength}:${digest}`,
      contentType,
      finalUrl: res.url || url,
    };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      status: null,
      error: timedOut ? "timeout" : e instanceof Error ? e.message : String(e),
      timedOut,
      retryable: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRobots(origin: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    return res.ok ? (await res.text()).slice(0, 100_000) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Model proposals are only ever PROPOSALS: the monitor validates them against the page text before storing. */
async function extract(system: string, user: string): Promise<unknown | null> {
  const result = await callAI({
    systemInstruction: system,
    messages: [{ role: "user", parts: [{ text: user }] }],
    timeoutMs: 30_000,
  });
  if (!result.ok) return null;
  try {
    return JSON.parse(result.text);
  } catch {
    return null;
  }
}

export function productionDeps(): MonitorDeps {
  return {
    store: monitorStore,
    fetchPage,
    fetchRobots,
    extract,
    now: () => new Date(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    newId: () => crypto.randomUUID(),
    delayMs: 1500,
    retries: 2,
  };
}

export async function runSourceHealthCheck(
  opts: { force?: boolean; onlySourceIds?: string[] } = {},
): Promise<MonitorSummary> {
  return runMonitor(productionDeps(), opts);
}
