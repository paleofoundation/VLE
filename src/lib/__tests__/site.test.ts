import { describe, expect, it } from "vitest";
import {
  PUBLIC_SITEMAP_PATHS,
  ROBOTS_DISALLOW_PATHS,
  SITE_URL,
  publicSitemapUrls,
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

  it("does not advertise auth or workspace paths in the sitemap", () => {
    for (const url of publicSitemapUrls()) {
      expect(url.startsWith(`${SITE_URL}/`) || url === SITE_URL).toBe(true);
      expect(privatePrefixes.some((prefix) => url === `${SITE_URL}${prefix}` || url.startsWith(`${SITE_URL}${prefix}/`))).toBe(false);
    }
  });

  it("blocks private prefixes in robots.txt and keeps the canonical host", () => {
    expect(SITE_URL).toBe("https://vle.exchange");
    expect([...ROBOTS_DISALLOW_PATHS]).toEqual(["/api/", "/ops", "/supplier", "/buyer", "/find", "/sign-in"]);
  });
});
