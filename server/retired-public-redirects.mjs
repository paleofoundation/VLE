// Indexed paths that no longer have pages. Destinations are current routes:
// laboratories → the laboratory page, join/access → signup, buyers → the brand desk.
export const retiredPublicRedirects = Object.freeze([
  Object.freeze({ source: "/for-laboratories", destination: "/resources/labs/light-labs" }),
  Object.freeze({ source: "/access", destination: "/email-sign-in" }),
  Object.freeze({ source: "/join", destination: "/email-sign-in" }),
  Object.freeze({ source: "/for-buyers", destination: "/brand" }),
]);

const bySource = new Map(retiredPublicRedirects.map((rule) => [rule.source, rule.destination]));

// One trailing slash only. `/access/private` and `/for-buyers-extra` stay unmatched.
export function retiredPublicRedirectTarget(pathname) {
  if (typeof pathname !== "string" || pathname.length < 2) return null;
  const bare = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return bySource.get(bare) ?? null;
}
