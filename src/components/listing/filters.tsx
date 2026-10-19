import { ANALYTES, CATEGORIES, DOCUMENT_TYPES, type ListingFilters } from "@/domain/public-listings";
import styles from "./directory.module.css";
export function ListingFiltersForm({ filters, countries, suppliers, labs = [], documents = false }: { filters: ListingFilters; countries: string[]; suppliers?: { slug: string; displayName: string }[]; documents?: boolean; labs?: string[] }) {
  const select = (name: string, label: string, values: { value: string; label: string }[], current?: string | number) => <label>{label}<select name={name} defaultValue={current ?? ""}><option value="">All</option>{values.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}</select></label>;
  const options = (values: readonly string[]) => values.map((value) => ({ value, label: value }));
  return <form className={styles.filters} method="get">
    <label>Search<input name="q" defaultValue={filters.q} placeholder="Supplier or product" maxLength={100} /></label>
    {select("category", "Category", options(CATEGORIES), filters.category)}
    {select("analyte", "Contaminant tested", options(ANALYTES), filters.analyte)}
    {select("country", "Country as stated", options(countries), filters.country)}
    {select("months", "Report freshness", [6, 12, 24].map((n) => ({ value: String(n), label: `Past ${n} months` })), filters.months)}
    {select("status", "Listing status", [{ value: "PUBLIC_DOCUMENTS", label: "Listed from public documents" }, { value: "MEMBER", label: "VLE member" }], filters.listingSource)}
    {documents ? select("type", "Document type", options(DOCUMENT_TYPES), filters.docType) : null}
    {documents && suppliers ? select("supplier", "Supplier", suppliers.map((s) => ({ value: s.slug, label: s.displayName })), filters.supplier) : null}
    {documents ? <>{select("lab", "Laboratory", options(labs), filters.lab)}<label>Report date from<input name="from" type="date" defaultValue={filters.from} /></label><label>Report date through<input name="to" type="date" defaultValue={filters.to} /></label></> : null}
    <div className={styles.filterActions}><button className="button buttonDark" type="submit">Apply filters</button><a className="textLink" href={documents ? "/documents" : "/suppliers"}>Clear filters</a></div>
  </form>;
}
