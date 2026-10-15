import type { VleArticle } from "@/domain/articles";
import { SITE_NAME } from "./seo";
import { absolutePublicUrl, SITE_URL, type PublicSitemapPath } from "./site";

/**
 * Public organization and website nodes already published on the homepage and FAQ.
 * Page JSON-LD reuses these ids so each route stays a self-contained graph.
 */
export type JsonLdNode = {
  "@type": string;
  "@id": string;
  [key: string]: unknown;
};

export const siteWebsiteNode: JsonLdNode = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  alternateName: "VLE",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const siteOrganizationNode: JsonLdNode = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Paleo Certified Inc.",
  legalName: "Paleo Certified Inc.",
  url: `${SITE_URL}/`,
  description: "Operator of Verified Lot Exchange (VLE).",
};

export const siteStructuredData = {
  "@context": "https://schema.org" as const,
  "@graph": [siteWebsiteNode, siteOrganizationNode],
};

/** Public routes that publish a WebPage (and, where noted, Service) JSON-LD graph. */
export const SEO_JSONLD_PATHS = [
  "/access",
  "/for-buyers",
  "/join",
  "/for-laboratories",
  "/for-suppliers",
  "/contaminants",
  "/articles",
  "/suppliers",
] as const;

export type SeoJsonLdPath = (typeof SEO_JSONLD_PATHS)[number];

type SeoPageCopy = {
  /** Existing document title. */
  name: string;
  /** Existing meta description. */
  description: string;
  service?: {
    name: string;
    serviceType: string;
  };
};

export const seoJsonLdPages: Record<SeoJsonLdPath, SeoPageCopy> = {
  "/access": {
    name: "Access VLE : reviewed pilot entry",
    description:
      "Clerk authenticates your identity. VLE operations then maps that identity to one verified organization and role; signing in alone reveals no private workspace data.",
  },
  "/for-buyers": {
    name: "For buyers : from requirement to reservation intent | VLE",
    description:
      "See how VLE connects a cocoa requirement to an eligible listing, a time-limited supplier quote, and a reservation intent.",
    service: {
      name: "Buyer walkthrough",
      serviceType: "From requirement to eligible lot",
    },
  },
  "/join": {
    name: "Join VLE : Free Core Access",
    description:
      "Join the Verified Lot Exchange pilot. Core access is free forever; optional white-glove help never buys qualification, listing eligibility, or evidence authenticity.",
    service: {
      name: "Core access",
      serviceType: "Free core access",
    },
  },
  "/for-laboratories": {
    name: "For laboratories : from controlled sample to authenticated evidence | VLE",
    description:
      "See how laboratories support VLE with controlled sample receipt and TECRID-authenticated evidence without turning a supplier PDF into a qualification decision.",
    service: {
      name: "Laboratory walkthrough",
      serviceType: "From controlled sample to trusted evidence",
    },
  },
  "/for-suppliers": {
    name: "For suppliers : from stocked lot to passed-lot listing | VLE",
    description:
      "See how VLE moves an identified ingredient lot through sampling, TECRID-linked evidence, deterministic qualification, and gated commercial intent.",
    service: {
      name: "Supplier walkthrough",
      serviceType: "From stocked lot to passed-lot listing",
    },
  },
  "/contaminants": {
    name: "Contaminant documentation | VLE",
    description:
      "Heavy metals, PFAS, and microplastics are separate documentation types. Heavy metals and PFAS link to their evidence indexes; microplastics links to its ICS vertical page while its index is in development. Suppliers attach PDFs or file references without creating qualification results.",
  },
  "/articles": {
    name: "Articles | VLE",
    description:
      "Why a category standard with scheduled retesting is a different record from an ingredient directory, and why a tested claim with no public result fails in a contamination crisis.",
  },
  "/suppliers": {
    name: "Supplier profiles | VLE",
    description:
      "Supplier profiles recommend TECRID verification. Verified suppliers rank higher in brand matching. VLE does not run that match on this page.",
  },
};

export type PageJsonLd = {
  "@context": "https://schema.org";
  "@graph": JsonLdNode[];
};

export function buildPageJsonLd(path: SeoJsonLdPath): PageJsonLd {
  const page = seoJsonLdPages[path];
  const url = absolutePublicUrl(path satisfies PublicSitemapPath);
  const webPage: JsonLdNode = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: page.name,
    description: page.description,
    inLanguage: "en",
    isPartOf: { "@id": siteWebsiteNode["@id"] },
    publisher: { "@id": siteOrganizationNode["@id"] },
    about: { "@id": siteOrganizationNode["@id"] },
  };
  const graph: JsonLdNode[] = [siteWebsiteNode, siteOrganizationNode, webPage];

  if (page.service) {
    const serviceId = `${url}#service`;
    webPage.mainEntity = { "@id": serviceId };
    graph.push({
      "@type": "Service",
      "@id": serviceId,
      name: page.service.name,
      serviceType: page.service.serviceType,
      description: page.description,
      url,
      provider: { "@id": siteOrganizationNode["@id"] },
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function buildArticleJsonLd(article: VleArticle): PageJsonLd {
  const url = absolutePublicUrl(article.path);
  const webPage: JsonLdNode = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: article.title,
    description: article.description,
    inLanguage: "en",
    isPartOf: { "@id": siteWebsiteNode["@id"] },
    publisher: { "@id": siteOrganizationNode["@id"] },
    mainEntity: { "@id": `${url}#article` },
  };
  const articleNode: JsonLdNode = {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.datePublished,
    inLanguage: "en",
    url,
    image: `${SITE_URL}/opengraph-image`,
    mainEntityOfPage: { "@id": `${url}#webpage` },
    author: { "@id": siteOrganizationNode["@id"] },
    publisher: { "@id": siteOrganizationNode["@id"] },
    citation: article.sources.map((source) => source.href),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [siteWebsiteNode, siteOrganizationNode, webPage, articleNode],
  };
}

/** Serialize JSON-LD and escape `<` so the payload cannot break out of the script tag. */
export function jsonLdHtml(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
