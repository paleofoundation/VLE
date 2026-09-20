/** Canonical production origin. Apex is the indexed host; www permanently redirects here. */
export const SITE_HOST = "vle.exchange";
export const SITE_WWW_HOST = "www.vle.exchange";
export const SITE_URL = `https://${SITE_HOST}`;

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

export type PublicSitemapPath = (typeof PUBLIC_SITEMAP_PATHS)[number];

/** Prefixes crawlers should skip. These are not access-control; authorization stays on the server. */
export const ROBOTS_DISALLOW_PATHS = [
  "/api/",
  "/ops",
  "/supplier",
  "/buyer",
  "/find",
  "/sign-in",
] as const;

/** Public pages that must stay indexable and off the Clerk handshake path. `/access` still needs Clerk for signed-in mapping. */
export const PUBLIC_PATHS_WITHOUT_CLERK = PUBLIC_SITEMAP_PATHS.filter((path) => path !== "/access");

export const INDEX_FOLLOW_HEADER = { key: "X-Robots-Tag", value: "index, follow" } as const;

export function isPublicSitemapPath(path: string): path is PublicSitemapPath {
  return (PUBLIC_SITEMAP_PATHS as readonly string[]).includes(path);
}

export function skipsClerkHandshake(path: string) {
  return (PUBLIC_PATHS_WITHOUT_CLERK as readonly string[]).includes(path);
}

export function absolutePublicUrl(path: PublicSitemapPath) {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

export function publicSitemapUrls() {
  return PUBLIC_SITEMAP_PATHS.map(absolutePublicUrl);
}

export function publicRobotsHeaders() {
  return PUBLIC_SITEMAP_PATHS.map((path) => ({
    source: path,
    headers: [INDEX_FOLLOW_HEADER],
  }));
}

export function wwwToApexRedirects() {
  return [
    {
      source: "/",
      has: [{ type: "host" as const, value: SITE_WWW_HOST }],
      destination: `${SITE_URL}/`,
      statusCode: 301 as const,
    },
    {
      source: "/:path*",
      has: [{ type: "host" as const, value: SITE_WWW_HOST }],
      destination: `${SITE_URL}/:path*`,
      statusCode: 301 as const,
    },
  ];
}

/** Collapse www to the live apex URL. Returns null when the host is already canonical. */
export function apexUrlFromRequest(host: string | null | undefined, href: string) {
  const hostname = host?.split(":")[0]?.toLowerCase();
  if (hostname !== SITE_WWW_HOST) return null;
  const url = new URL(href);
  url.protocol = "https:";
  url.hostname = SITE_HOST;
  url.port = "";
  return url.toString();
}
