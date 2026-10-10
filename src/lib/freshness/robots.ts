/**
 * Minimal robots.txt handling. We honour Disallow/Allow for "*" and for our
 * own user agent, longest-match wins. If robots.txt cannot be read we do NOT
 * assume permission is denied, but we also never bypass an explicit Disallow.
 */

export const BOT_NAME = "RaastaAI-HealthCheck";

type Rule = { allow: boolean; path: string };

export function parseRobots(text: string): { rules: Rule[] } {
  const rules: Rule[] = [];
  let applies = false;
  let sawGroup = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const key = (k ?? "").trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      const ua = value.toLowerCase();
      const match = ua === "*" || BOT_NAME.toLowerCase().includes(ua);
      applies = sawGroup && applies && match ? true : match;
      sawGroup = true;
    } else if (applies && (key === "disallow" || key === "allow")) {
      if (key === "disallow" && value === "") continue;
      rules.push({ allow: key === "allow", path: value });
    }
  }
  return { rules };
}

export function isAllowed(robots: { rules: Rule[] }, pathWithQuery: string): boolean {
  let best: Rule | null = null;
  for (const rule of robots.rules) {
    if (!rule.path || !pathWithQuery.startsWith(rule.path.replace(/\*$/, ""))) continue;
    if (
      !best ||
      rule.path.length > best.path.length ||
      (rule.path.length === best.path.length && rule.allow)
    )
      best = rule;
  }
  return best ? best.allow : true;
}
