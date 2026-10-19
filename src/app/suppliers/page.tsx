import Link from "next/link";
import { listSuppliers } from "@/lib/public-listings";
import { listingFilters, type SearchValues } from "@/domain/listing-filters";
import { ListingFiltersForm } from "@/components/listing/filters";
import styles from "@/components/listing/directory.module.css";
import { publicPageMetadata } from "@/lib/seo";
import { PageStructuredData } from "../page-structured-data";
export const dynamic = "force-dynamic";
export const metadata = publicPageMetadata("/suppliers", "Ingredient suppliers with public documents | VLE", "Browse supplier-published ingredient documents freely. Filter by category, reported tests and date. Supplier-published documents are not VLE-verified results.");
export default async function SuppliersPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  const filters = listingFilters(await searchParams);
  const [suppliers, all] = await Promise.all([listSuppliers(filters), listSuppliers()]);
  const countries = [...new Set(all.map((s) => s.country).filter((s): s is string => !!s))].sort();
  return <main id="main-content" className={styles.page}>
    <PageStructuredData path="/suppliers" />
    <header className={styles.hero}><p className="eyebrow">Ingredient sourcing / public evidence</p><h1>Find suppliers with documents.</h1><p>Read original supplier-published files freely. Each document names its source. Lot qualification requires separate VLE evidence.</p></header>
    <div className={styles.layout}><ListingFiltersForm filters={filters} countries={countries} /><div><p className={styles.results}>{suppliers.length} suppliers match these filters</p>
      {suppliers.length ? <div className={styles.cards}>{suppliers.map((s) => <article className={styles.card} key={s.id}>
        <span className={styles.chip}>{s.listingSource === "MEMBER" ? "VLE member" : "Listed from public documents"}</span><h2><Link href={`/suppliers/${s.slug}`}>{s.displayName}</Link></h2>
        <p>{s.country ?? "Country not stated"}<br />{s.categories.join(" · ")}</p><div className={styles.metrics}><span><strong>{s.productCount}</strong>products in documents</span><span><strong>{s.documentCount}</strong>public documents</span></div>
        <p>Latest report: {s.latestReportDate ?? "Date not stated"}</p><Link className="textLink" href={`/suppliers/${s.slug}`}>View profile →</Link>
      </article>)}</div> : <p className={styles.empty}>No suppliers match these filters.</p>}</div></div>
  </main>;
}
