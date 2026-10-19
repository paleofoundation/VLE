import Link from "next/link";
import { listDocuments, listSuppliers } from "@/lib/public-listings";
import { listingFilters, type SearchValues } from "@/domain/listing-filters";
import { ListingFiltersForm } from "@/components/listing/filters";
import { DocumentSourceLabel } from "@/components/listing";
import { publicPageMetadata } from "@/lib/seo";
import styles from "@/components/listing/directory.module.css";
export const dynamic = "force-dynamic";
export const metadata = publicPageMetadata("/documents", "Public ingredient test documents | VLE", "Lot-level test documents published by suppliers. Viewing is free. Only VLE-issued TECRIDs carry a verified badge.");
export default async function DocumentsPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  const filters = { ...listingFilters(await searchParams), includeUnavailable: true };
  const [documents, all, suppliers] = await Promise.all([listDocuments(filters), listDocuments({ includeUnavailable: true }), listSuppliers()]);
  const countries = [...new Set(suppliers.map((s) => s.country).filter((s): s is string => !!s))].sort();
  const labs = [...new Set(all.map((d) => d.document.labName).filter((s): s is string => !!s))].sort();
  return <main id="main-content" className={styles.page}><header className={styles.hero}><p className="eyebrow">Public document library</p><h1>Read the original documents.</h1><p>Lot-level test documents published by suppliers. Viewing is free. Only VLE-issued TECRIDs carry a verified badge.</p></header>
    <div className={styles.layout}><ListingFiltersForm filters={filters} countries={countries} suppliers={suppliers} labs={labs} documents /><div>
      <p className={styles.results}>{documents.length} documents match these filters. Partial and unstated dates appear after complete report dates.</p>
      {documents.length ? <div className={styles.cards}>{documents.map(({ document: d, supplier: s }) => <article className={styles.card} key={d.id}>
        <span className={styles.chip}>{d.docType}</span><h2><Link href={`/suppliers/${s.slug}`}>{s.displayName}</Link></h2>
        <p><strong>{d.productName ?? "Product not stated"}</strong><br />Lot / batch: {d.lotOrBatch ?? "Not stated"}</p><p>{d.testsText}</p>
        <p>{d.labName ?? "Lab not named on document"}<br />Accreditation as stated: {d.labAccreditationAsStated ?? "Not stated"}</p>
        <p>Report date: {d.reportDate ?? d.reportDateText ?? "Not stated"}</p><DocumentSourceLabel domain={d.sourceDomain} date={d.foundAt} sourcePageUrl={d.sourcePageUrl} />
        {d.linkState === "LIVE" ? <a className="textLink" href={d.sourceUrl} rel="nofollow noopener noreferrer">Open original document ↗</a> : <p>No longer published by supplier</p>}
      </article>)}</div> : <p className={styles.empty}>No documents match these filters.</p>}
    </div></div>
  </main>;
}
