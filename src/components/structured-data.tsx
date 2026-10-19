import { jsonLdHtml, siteStructuredData } from "@/lib/structured-data";
export function StructuredData({ value = siteStructuredData }: { value?: unknown }) { return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(value) }} />; }
