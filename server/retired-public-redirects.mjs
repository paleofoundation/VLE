// Indexed paths are public pages again: /for-buyers, /join, /access, and
// /for-laboratories. Keep this map so a later retirement can stay one 301
// before Vinext's trailing-slash redirect. It is empty on purpose.
export const retiredPublicRedirects = Object.freeze([]);

const bySource = new Map(retiredPublicRedirects.map((rule) => [rule.source, rule.destination]));

// One trailing slash only. `/access/private` and `/for-buyers-extra` stay unmatched.
export function retiredPublicRedirectTarget(pathname) {
  if (typeof pathname !== "string" || pathname.length < 2) return null;
  const bare = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return bySource.get(bare) ?? null;
}
