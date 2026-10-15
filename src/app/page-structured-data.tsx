import { buildPageJsonLd, jsonLdHtml, type SeoJsonLdPath } from "@/lib/structured-data";

export function PageStructuredData({ path }: { path: SeoJsonLdPath }) {
  return (
    <script
      id={`page-structured-data-${path.slice(1)}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(buildPageJsonLd(path)) }}
    />
  );
}
