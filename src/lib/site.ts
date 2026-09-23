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

/**
 * Marketing pages that never run Clerk.
 * Anonymous `/access` is also public (`requestSkipsClerk`), but a handshake return or
 * `__session` cookie still runs Clerk so signed-in organization mapping keeps working.
 */
export const PUBLIC_PATHS_WITHOUT_CLERK = PUBLIC_SITEMAP_PATHS.filter((path) => path !== "/access");
const CLERK_SESSION_COOKIE = "__session";

export const INDEX_FOLLOW_HEADER = { key: "X-Robots-Tag", value: "index, follow" } as const;

export function isPublicSitemapPath(path: string): path is PublicSitemapPath {
  return (PUBLIC_SITEMAP_PATHS as readonly string[]).includes(path);
}

export function skipsClerkHandshake(path: string) {
  return (PUBLIC_PATHS_WITHOUT_CLERK as readonly string[]).includes(path);
}

function cookieValue(cookieHeader: string, name: string) {
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    const cookieName = (separator === -1 ? part : part.slice(0, separator)).trim();
    const value = separator === -1 ? "" : part.slice(separator + 1).trim();
    if (cookieName === name || cookieName.startsWith(`${name}_`)) return value;
  }
  return null;
}

/** True when the URL carries a Clerk handshake/sync query (`__clerk_*`). */
export function hasClerkHandshakeParam(searchKeys: Iterable<string>) {
  for (const key of searchKeys) {
    if (key.startsWith("__clerk_")) return true;
  }
  return false;
}

/**
 * Clerk must run on `/access` only when it has to finish a handshake or read a signed-in session.
 * A development-instance document GET with no session 307s forever if middleware also strips `__clerk_handshake`.
 */
export function accessRequestNeedsClerk(searchKeys: Iterable<string>, cookieHeader: string | null | undefined) {
  if (hasClerkHandshakeParam(searchKeys)) return true;
  return Boolean(cookieHeader && cookieValue(cookieHeader, CLERK_SESSION_COOKIE));
}

/** Public indexable requests that must not enter `clerkMiddleware` (and therefore cannot be handshake-redirected). */
export function requestSkipsClerk(pathname: string, searchKeys: Iterable<string>, cookieHeader: string | null | undefined) {
  if (skipsClerkHandshake(pathname)) return true;
  if (pathname === "/access") return !accessRequestNeedsClerk(searchKeys, cookieHeader);
  return false;
}

/**
 * Single 301 off a Clerk handshake URL when this request will not run Clerk.
 * Returns null for `/access?...__clerk_handshake` so Clerk can set cookies instead of looping.
 */
export function clerkBypassRedirect(href: string, cookieHeader: string | null | undefined) {
  const url = new URL(href);
  if (!requestSkipsClerk(url.pathname, url.searchParams.keys(), cookieHeader)) return null;
  return publicUrlWithoutClerkHandshake(href);
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

/** Drop Clerk handshake query params so crawlers never land on a 500 handshake URL. */
export function publicUrlWithoutClerkHandshake(href: string) {
  const url = new URL(href);
  if (!isPublicSitemapPath(url.pathname)) return null;
  let changed = false;
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("__clerk_")) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  return changed ? url.toString() : null;
}
