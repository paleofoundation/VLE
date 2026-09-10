/** Canonical production origin. Apex is the indexed host; www permanently redirects here. */
export const SITE_URL = "https://vle.exchange";

/**
 * Public marketing pages confirmed HTTP 200 on production.
 * Workspace, API, and sign-in routes are intentionally omitted.
 */
export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/for-suppliers",
  "/for-buyers",
  "/for-laboratories",
  "/access",
  "/faq",
  "/join",
] as const;

/** Prefixes crawlers should skip. These are not access-control; authorization stays on the server. */
export const ROBOTS_DISALLOW_PATHS = [
  "/api/",
  "/ops",
  "/supplier",
  "/buyer",
  "/find",
  "/sign-in",
] as const;

export function absolutePublicUrl(path: (typeof PUBLIC_SITEMAP_PATHS)[number]) {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

export function publicSitemapUrls() {
  return PUBLIC_SITEMAP_PATHS.map(absolutePublicUrl);
}
