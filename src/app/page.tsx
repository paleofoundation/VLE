import Link from "next/link";
import { SiteStructuredData } from "./site-structured-data";
import { ExchangeShell } from "@/exchange/shell";
import { SearchForm, SupplierCard } from "@/exchange/ui";
import { FREE_LINE, HERO_LINE } from "@/exchange/copy";
import { categories, kasandrinos } from "@/exchange/example-data";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata(
  "/",
  "VLE | Verified Lot Exchange",
  "Know what's in the lot before you buy it. VLE is free for brands and free to list.",
);

export default function HomePage() {
  return (
    <ExchangeShell current="/">
      <SiteStructuredData />
      <main id="main-content">
        <div className="x-wrap">
          <section className="x-hero" aria-labelledby="hero-heading">
            <p className="x-kicker">Verified Lot Exchange</p>
            <h1 id="hero-heading" data-testid="hero-line">
              {HERO_LINE}
            </h1>
            <p className="x-lead">
              A free marketplace where food and supplement brands find ingredient suppliers by what is actually in the lot. Every listing is built on documents: lab reports, certificates, and lot records.
            </p>
            <SearchForm />
            <p className="x-free" data-testid="free-line">
              {FREE_LINE}
            </p>
            <ul className="x-chips" aria-label="Categories">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link className="x-chip" href={`/suppliers?category=${category.id}`}>
                    {category.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="x-section" aria-labelledby="suppliers-heading">
            <h2 id="suppliers-heading">Supplier</h2>
            <p>
              Kasandrinos is the supplier on this list. Its olive oil is a draft preview awaiting a COA, so the product is not published on the exchange. Product name, origin, sizes, and description come from kasandrinos.com. Lab results pending.
            </p>
            <div className="x-card-grid">
              <SupplierCard />
            </div>
          </section>

          <section className="x-section" aria-labelledby="match-heading">
            <h2 id="match-heading">Matched before anyone talks</h2>
            <ul className="x-principles">
              <li>
                <h3>What, how much, and for whom</h3>
                <p>Each profile states what the supplier makes, in what volumes, and for which markets.</p>
              </li>
              <li>
                <h3>Specs before the first conversation</h3>
                <p>Specs and lab results sit on the page. The sample request stays in the same place.</p>
              </li>
              <li>
                <h3>A clear next step</h3>
                <p>Every request asks for volume, timing, and intended use, then says what happens next.</p>
              </li>
            </ul>
          </section>

          <section className="x-section" aria-labelledby="library-heading">
            <h2 id="library-heading">Document library</h2>
            <p>Documents are open to everyone. They are never behind sign-in.</p>
            <ul className="x-doc-list">
              <li className="x-doc">
                <p className="x-badge">Public</p>
                <h3 className="x-h3">No documents are on file</h3>
                <p>Kasandrinos has no public documents yet. A document added later stays open to everyone.</p>
                <p>
                  <Link className="x-text-link" href={`${kasandrinos.path}#documents`}>
                    Open the document section
                  </Link>
                </p>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </ExchangeShell>
  );
}
