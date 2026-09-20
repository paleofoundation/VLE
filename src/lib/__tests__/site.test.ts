import { describe, expect, it } from "vitest";
import { publicPageMetadata } from "../seo";
import {
  PUBLIC_PATHS_WITHOUT_CLERK,
  PUBLIC_SITEMAP_PATHS,
  ROBOTS_DISALLOW_PATHS,
  SITE_URL,
  apexUrlFromRequest,
  absolutePublicUrl,
  isPublicSitemapPath,
  publicRobotsHeaders,
  publicSitemapUrls,
  publicUrlWithoutClerkHandshake,
  skipsClerkHandshake,
  wwwToApexRedirects,
} from "../site";

const privatePrefixes = ["/api", "/ops", "/supplier", "/buyer", "/find", "/sign-in"];

describe("public search catalog", () => {
  it("lists only the live public marketing pages", () => {
    expect([...PUBLIC_SITEMAP_PATHS]).toEqual([
      "/",
      "/for-suppliers",
      "/for-buyers",
      "/for-laboratories",
      "/access",
      "/faq",
      "/join",
    ]);
  });

  it("uses trailing-slash homepage canonicals that match the live 200 URL", () => {
    expect(absolutePublicUrl("/")).toBe("https://vle.exchange/");
    expect(absolutePublicUrl("/for-suppliers")).toBe("https://vle.exchange/for-suppliers");
    expect(publicSitemapUrls()).toEqual([
      "https://vle.exchange/",
      "https://vle.exchange/for-suppliers",
      "https://vle.exchange/for-buyers",
      "https://vle.exchange/for-laboratories",
      "https://vle.exchange/access",
      "https://vle.exchange/faq",
      "https://vle.exchange/join",
    ]);
  });

  it("does not advertise auth or workspace paths in the sitemap", () => {
    for (const url of publicSitemapUrls()) {
      expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
      expect(privatePrefixes.some((prefix) => url === `${SITE_URL}${prefix}` || url.startsWith(`${SITE_URL}${prefix}/`))).toBe(false);
    }
  });

  it("blocks private prefixes in robots.txt and keeps the canonical host", () => {
    expect(SITE_URL).toBe("https://vle.exchange");
    expect([...ROBOTS_DISALLOW_PATHS]).toEqual(["/api/", "/ops", "/supplier", "/buyer", "/find", "/sign-in"]);
  });

  it("keeps commercial money pages indexable and off the Clerk handshake", () => {
    for (const path of ["/for-suppliers", "/for-buyers", "/for-laboratories"] as const) {
      expect(isPublicSitemapPath(path)).toBe(true);
      expect(skipsClerkHandshake(path)).toBe(true);
      expect(publicPageMetadata(path, "Title", "Description").robots).toEqual({ index: true, follow: true });
      expect(publicPageMetadata(path, "Title", "Description").alternates).toEqual({ canonical: `${SITE_URL}${path}` });
    }
    expect([...PUBLIC_PATHS_WITHOUT_CLERK]).toEqual([
      "/",
      "/for-suppliers",
      "/for-buyers",
      "/for-laboratories",
      "/faq",
      "/join",
    ]);
    expect(skipsClerkHandshake("/access")).toBe(false);
  });

  it("emits index,follow headers for every public sitemap path", () => {
    expect(publicRobotsHeaders()).toEqual(
      PUBLIC_SITEMAP_PATHS.map((path) => ({
        source: path,
        headers: [{ key: "X-Robots-Tag", value: "index, follow" }],
      })),
    );
  });

  it("collapses www to a single 301 on the apex host", () => {
    expect(wwwToApexRedirects()).toEqual([
      {
        source: "/",
        has: [{ type: "host", value: "www.vle.exchange" }],
        destination: "https://vle.exchange/",
        statusCode: 301,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.vle.exchange" }],
        destination: "https://vle.exchange/:path*",
        statusCode: 301,
      },
    ]);
    expect(apexUrlFromRequest("www.vle.exchange", "https://www.vle.exchange/faq?q=1")).toBe("https://vle.exchange/faq?q=1");
    expect(apexUrlFromRequest("vle.exchange", "https://vle.exchange/faq")).toBeNull();
  });

  it("strips Clerk handshake params from public URLs only", () => {
    expect(publicUrlWithoutClerkHandshake("https://vle.exchange/access?__clerk_handshake=1")).toBe("https://vle.exchange/access");
    expect(publicUrlWithoutClerkHandshake("https://vle.exchange/?__clerk_handshake=1&keep=1")).toBe("https://vle.exchange/?keep=1");
    expect(publicUrlWithoutClerkHandshake("https://vle.exchange/ops?__clerk_handshake=1")).toBeNull();
    expect(publicUrlWithoutClerkHandshake("https://vle.exchange/join")).toBeNull();
  });
});
