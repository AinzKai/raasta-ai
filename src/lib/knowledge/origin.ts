/**
 * Where does a link lead? Government sources and third-party tools must never
 * look alike: a Google Maps link is a convenience, not an official source.
 * Decided from the URL alone, so it cannot be flattered by a record's status.
 */
export type LinkOrigin = "government" | "phone" | "third_party";

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function linkOrigin(url: string): LinkOrigin {
  if (url.startsWith("tel:")) return "phone";
  const host = hostname(url);
  if (host && (host === "gov.pk" || host.endsWith(".gov.pk"))) return "government";
  return "third_party";
}

/** Human name for a third-party destination, e.g. "Google Maps". */
export function thirdPartyName(url: string): string {
  const host = hostname(url);
  if (!host) return url;
  if (/(^|\.)google\.[a-z.]+$/.test(host) && new URL(url).pathname.startsWith("/maps"))
    return "Google Maps";
  return host;
}
