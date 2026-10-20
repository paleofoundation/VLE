import Link from "next/link";
import { useId } from "react";
import { EXAMPLE_SEARCH, PRICE_LINE } from "./copy";
import { exampleSearchHref, exampleSupplier, type ExampleLot, type ExampleResult } from "./example-data";

export function SearchForm({ defaultQuery = "" }: { defaultQuery?: string }) {
  const id = useId();
  return (
    <form className="x-search" action="/suppliers" method="get" role="search" data-testid="search">
      <label htmlFor={id}>Search in plain language</label>
      <div className="x-search-row">
        <input id={id} name="q" defaultValue={defaultQuery} placeholder={EXAMPLE_SEARCH} autoComplete="off" enterKeyHint="search" />
        <button className="x-btn" type="submit">
          Search
        </button>
      </div>
      <p className="x-example-search">
        Example search:{" "}
        <Link className="x-text-link" href={exampleSearchHref}>
          {EXAMPLE_SEARCH}
        </Link>
      </p>
    </form>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" }) {
  return <span className={tone === "accent" ? "x-badge x-badge-accent" : "x-badge"}>{children}</span>;
}

export function PhotoSlot() {
  return (
    <div className="x-slot" role="img" aria-label="Photo slot. A supplier photo will go here.">
      <span>Photo slot</span>
      <small>A supplier photo will go here.</small>
    </div>
  );
}

export function FileSlot() {
  return (
    <div className="x-slot-file" role="img" aria-label="File slot. A supplier file will go here.">
      <span>File slot</span>
      <small>A supplier file will go here.</small>
    </div>
  );
}

export function PriceTag({ mode }: { mode: "hidden" | "example" }) {
  if (mode === "example") {
    return (
      <p className="x-price" data-testid="price-example">
        <span className="x-price-label">Price per unit</span>
        <strong>{exampleSupplier.priceExample}</strong>
        <Badge>Signed-in view, EXAMPLE</Badge>
      </p>
    );
  }
  return (
    <p className="x-price" data-testid="price-gate">
      <span className="x-price-label">Price per unit</span>
      <Link className="x-text-link" href="/email-sign-in">
        {PRICE_LINE}
      </Link>
    </p>
  );
}

export function SupplierCard() {
  return (
    <article className="x-card" data-testid="supplier-card">
      <PhotoSlot />
      <div className="x-card-body">
        <Badge tone="accent">EXAMPLE</Badge>
        <h3 className="x-h3">
          <Link className="x-text-link" href={exampleSupplier.path}>
            {exampleSupplier.name}
          </Link>
        </h3>
        <p>{exampleSupplier.makes}</p>
        <dl className="x-meta">
          <div>
            <dt>Category</dt>
            <dd>{exampleSupplier.categoryLabel}</dd>
          </div>
          <div>
            <dt>MOQ (minimum order)</dt>
            <dd>{exampleSupplier.moq}</dd>
          </div>
          <div>
            <dt>Lead time</dt>
            <dd>{exampleSupplier.leadTime}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

const columns: { key: keyof ExampleResult; label: string }[] = [
  { key: "analyte", label: "Analyte" },
  { key: "value", label: "Value" },
  { key: "unit", label: "Unit" },
  { key: "limit", label: "Limit" },
  { key: "method", label: "Method" },
  { key: "lab", label: "Lab" },
  { key: "date", label: "Date" },
  { key: "plain", label: "Plain words" },
];

export function ResultsTable({ lot }: { lot: ExampleLot }) {
  return (
    <div className="x-results-wrap">
      <table className="x-results" data-testid="results-table">
        <caption>EXAMPLE results for {lot.name}. Not a real lab report.</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lot.results.map((row) => (
            <tr key={`${lot.id}-${row.analyte}`}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.label} className={column.key === "plain" && row.plain === "Not detected" ? "x-plain" : undefined}>
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProfileTabs() {
  const tabs = [
    { href: "#overview", label: "Overview" },
    { href: "#products", label: "Products", count: 1 },
    { href: "#lots", label: "Lots", count: exampleLotsCount() },
    { href: "#documents", label: "Documents", count: 3 },
    { href: "#certifications", label: "Certifications", count: 2 },
  ];
  return (
    <nav className="x-tabs" aria-label="Profile sections" data-testid="profile-tabs">
      {tabs.map((tab) => (
        <a key={tab.href} href={tab.href}>
          {tab.label}
          {tab.count ? <span className="x-count">{tab.count}</span> : null}
        </a>
      ))}
    </nav>
  );
}

function exampleLotsCount() {
  return 2;
}
