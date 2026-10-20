import Link from "next/link";
import { PageStructuredData } from "../page-structured-data";
import { ExchangeShell } from "@/exchange/shell";
import { NeedForm } from "@/exchange/need-form";
import { CompareBoard } from "@/exchange/compare";
import { SearchForm, SupplierCard } from "@/exchange/ui";
import {
  categories,
  contaminants,
  directoryHref,
  documentAges,
  exampleDocuments,
  exampleSupplier,
  filterChips,
  hrefWithout,
  isSearch,
  readFilters,
  supplierMatches,
  type FilterState,
} from "@/exchange/example-data";
import { publicPageMetadata } from "@/lib/seo";
import { seoJsonLdPages } from "@/lib/structured-data";

const pageCopy = seoJsonLdPages["/suppliers"];

export const metadata = publicPageMetadata("/suppliers", pageCopy.name, pageCopy.description);

function Choice({
  filters,
  group,
  value,
  label,
}: {
  filters: FilterState;
  group: "category" | "contaminant" | "result" | "country" | "certification" | "documentAge" | "hasPrice";
  value: string | boolean | undefined;
  label: string;
}) {
  const current = filters[group];
  const selected = current === value || (value === undefined && (current === undefined || current === false));
  const href =
    value === undefined
      ? hrefWithout(filters, group)
      : directoryHref(filters, group === "hasPrice" ? { hasPrice: Boolean(value) } : { [group]: value });
  return (
    <Link className="x-filter-link" href={href} aria-current={selected ? "true" : undefined}>
      {label}
    </Link>
  );
}

function FilterGroups({ filters }: { filters: FilterState }) {
  return (
    <div className="x-filter-groups">
      <fieldset className="x-filter-group">
        <legend>Category</legend>
        <div>
          <Choice filters={filters} group="category" value={undefined} label="Any" />
          {categories.map((category) => (
            <Choice key={category.id} filters={filters} group="category" value={category.id} label={category.label} />
          ))}
        </div>
      </fieldset>
      <fieldset className="x-filter-group">
        <legend>Contaminant tested</legend>
        <div>
          <Choice filters={filters} group="contaminant" value={undefined} label="Any" />
          {contaminants.map((item) => (
            <Choice key={item.id} filters={filters} group="contaminant" value={item.id} label={item.label} />
          ))}
        </div>
      </fieldset>
      <fieldset className="x-filter-group">
        <legend>Result</legend>
        <div>
          <Choice filters={filters} group="result" value={undefined} label="Any" />
          <Choice filters={filters} group="result" value="not-detected" label="Not detected" />
        </div>
      </fieldset>
      <fieldset className="x-filter-group">
        <legend>Country</legend>
        <div>
          <Choice filters={filters} group="country" value={undefined} label="Any" />
          <Choice filters={filters} group="country" value="example-country" label="EXAMPLE country" />
        </div>
      </fieldset>
      <fieldset className="x-filter-group">
        <legend>Certification</legend>
        <div>
          <Choice filters={filters} group="certification" value={undefined} label="Any" />
          <Choice filters={filters} group="certification" value="example-certification" label="EXAMPLE certification" />
        </div>
      </fieldset>
      <fieldset className="x-filter-group">
        <legend>Document age</legend>
        <div>
          <Choice filters={filters} group="documentAge" value={undefined} label="Any age" />
          {documentAges.map((age) => (
            <Choice key={age.id} filters={filters} group="documentAge" value={age.id} label={age.label} />
          ))}
        </div>
      </fieldset>
      <fieldset className="x-filter-group">
        <legend>Has price</legend>
        <div>
          <Choice filters={filters} group="hasPrice" value={undefined} label="Any" />
          <Choice filters={filters} group="hasPrice" value label="Has a price on file" />
        </div>
      </fieldset>
      <p className="x-note">
        A price on file still shows Sign in to see prices until a buyer is signed in.{" "}
        <Link className="x-text-link" href="/suppliers?category=cocoa">
          Preview an empty search
        </Link>
      </p>
    </div>
  );
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = readFilters(await searchParams);
  const chips = filterChips(filters);
  const matched = supplierMatches(filters);
  const searched = isSearch(filters);

  return (
    <ExchangeShell current="/suppliers">
      <PageStructuredData path="/suppliers" />
      <main id="main-content">
        <div className="x-wrap">
          <p className="x-kicker">Directory</p>
          <h1 className="x-display">Suppliers</h1>
          <p className="x-lead">Find a supplier by what is in the lot. Documents on this page are public.</p>
          <SearchForm defaultQuery={filters.q} />
          {chips.length ? (
            <div className="x-applied" data-testid="applied-filters">
              <p>Filters applied</p>
              <ul className="x-applied-list">
                {chips.map((chip) => (
                  <li key={chip.key}>
                    <Link href={hrefWithout(filters, chip.key)}>{chip.label}. Remove</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="x-directory">
            <div>
              <details className="x-filters-mobile">
                <summary>Filters</summary>
                <FilterGroups filters={filters} />
              </details>
              <aside className="x-filters-desktop" aria-label="Filters">
                <FilterGroups filters={filters} />
              </aside>
            </div>
            <div>
              {matched ? (
                <div className="x-card-grid">
                  <SupplierCard />
                </div>
              ) : (
                <p>No example supplier matched these filters.</p>
              )}
              <CompareBoard
                options={[
                  {
                    id: exampleSupplier.id,
                    title: exampleSupplier.name,
                    rows: [
                      { label: "Makes", value: exampleSupplier.makes },
                      { label: "Volumes", value: exampleSupplier.volumes },
                      { label: "Markets", value: exampleSupplier.markets },
                      { label: "MOQ (minimum order)", value: exampleSupplier.moq },
                      { label: "Lead time", value: exampleSupplier.leadTime },
                      { label: "Lead, plain words", value: "Not detected" },
                    ],
                  },
                ]}
              />
              <section className="x-section" aria-labelledby="public-docs">
                <h2 id="public-docs">Document library</h2>
                <p>These example records are visible to everyone. No sign-in.</p>
                <ul className="x-doc-list">
                  {exampleDocuments.map((document) => (
                    <li key={document.id} className="x-doc">
                      <p className="x-badge">Public</p>
                      <h3 className="x-h3">{document.name}</h3>
                      <p>{document.date}</p>
                    </li>
                  ))}
                </ul>
              </section>
              {searched && (matched ? 1 : 0) < 2 ? <NeedForm found={matched ? 1 : 0} /> : null}
            </div>
          </div>
        </div>
      </main>
    </ExchangeShell>
  );
}
