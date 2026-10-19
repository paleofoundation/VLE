import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { publicPageMetadata } from "../seo";
import {
  SEO_JSONLD_PATHS,
  buildPageJsonLd,
  jsonLdHtml,
  seoJsonLdPages,
  siteStructuredData,
} from "../structured-data";

describe("page JSON-LD", () => {
  it("keeps the existing homepage graph to the public website and organization", () => {
    expect(JSON.stringify(siteStructuredData)).toBe(
      JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": "https://vle.exchange/#website",
            url: "https://vle.exchange/",
            name: "Verified Lot Exchange",
            alternateName: "VLE",
            publisher: { "@id": "https://vle.exchange/#organization" },
          },
          {
            "@type": "Organization",
            "@id": "https://vle.exchange/#organization",
            name: "Paleo Certified Inc.",
            legalName: "Paleo Certified Inc.",
            url: "https://vle.exchange/",
            description: "Operator of Verified Lot Exchange (VLE).",
          },
        ],
      }),
    );
  });

  it("emits one ld+json block per audited route, with real public URLs", () => {
    for (const path of SEO_JSONLD_PATHS) {
      const data = buildPageJsonLd(path);
      const html = `<script type="application/ld+json">${jsonLdHtml(data)}</script>`;
      const types = data["@graph"].map((node) => node["@type"]);
      const serialized = JSON.stringify(data);

      expect(data["@context"]).toBe("https://schema.org");
      expect(html.match(/type="application\/ld\+json"/g)).toHaveLength(1);
      expect(types).toEqual(expect.arrayContaining(["WebSite", "Organization", "WebPage"]));
      expect(serialized).toContain(`https://vle.exchange${path}`);
      expect(serialized).toContain("Paleo Certified Inc.");
      expect(serialized).toContain(seoJsonLdPages[path].name);
      expect(serialized).toContain(seoJsonLdPages[path].description);
      expect(serialized.toLowerCase()).not.toContain("part" + "ner");
      expect(serialized).not.toContain("aggregateRating");
      expect(serialized).not.toContain("reviewCount");
      expect(serialized).not.toContain("ratingValue");
      expect(publicPageMetadata(path, seoJsonLdPages[path].name, seoJsonLdPages[path].description).robots).toEqual({
        index: true,
        follow: true,
      });
    }
  });

  it("adds a Service node only where the page describes a public service", () => {
    expect(buildPageJsonLd("/access")["@graph"].map((node) => node["@type"])).toEqual([
      "WebSite",
      "Organization",
      "WebPage",
    ]);

    for (const path of ["/for-buyers", "/join", "/for-laboratories", "/for-suppliers"] as const) {
      const service = buildPageJsonLd(path)["@graph"].find((node) => node["@type"] === "Service");
      expect(service?.name).toBe(seoJsonLdPages[path].service?.name);
      expect(service?.serviceType).toBe(seoJsonLdPages[path].service?.serviceType);
      expect(String(service?.name)).not.toMatch(/[\u2013\u2014]/);
      expect(String(service?.serviceType)).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it("escapes angle brackets in the script payload", () => {
    expect(jsonLdHtml({ note: "</script><script>" })).toBe('{"note":"\\u003c/script>\\u003cscript>"}');
  });

  it("mounts the organization graph in the rebuilt root layout", () => {
    const source = readFileSync("src/app/layout.tsx", "utf8");
    const helper = readFileSync("src/components/structured-data.tsx", "utf8");
    expect(source).toContain("<StructuredData />");
    expect(source.toLowerCase()).not.toContain("noindex");
    expect(helper).toContain('type="application/ld+json"');
    expect(helper).toContain("jsonLdHtml(value)");
  });
});
