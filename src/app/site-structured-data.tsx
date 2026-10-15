import { jsonLdHtml, siteStructuredData } from "@/lib/structured-data";

export function SiteStructuredData() {
  return (
    <script
      id="site-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(siteStructuredData) }}
    />
  );
}
