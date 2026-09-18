import { SITE_NAME } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: "VLE",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Paleo Certified Inc.",
      legalName: "Paleo Certified Inc.",
      url: `${SITE_URL}/`,
      description: "Operator of Verified Lot Exchange (VLE).",
    },
  ],
};

export function SiteStructuredData() {
  return (
    <script
      id="site-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
    />
  );
}
