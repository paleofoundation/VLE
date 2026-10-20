import type { Metadata } from "next";
import { ExchangeShell } from "@/exchange/shell";
import { CompareSpecimen } from "@/exchange/compare";
import { EmailSignInScreen } from "@/exchange/email-sign-in";
import { Badge, PhotoSlot, PriceTag, ResultsTable, SearchForm, SupplierCard } from "@/exchange/ui";
import { exampleLots } from "@/exchange/example-data";

export const metadata: Metadata = {
  title: "Design system | VLE",
  description: "Colors, type, buttons, search, supplier card, tabs, badge, results table, and price tag for Verified Lot Exchange.",
  robots: { index: false, follow: false },
};

const colors = [
  { name: "Paper", hex: "#F3F2EE", ink: "#1C1B19" },
  { name: "Surface", hex: "#FFFFFF", ink: "#1C1B19" },
  { name: "Ink", hex: "#1C1B19", ink: "#FFFFFF" },
  { name: "Muted", hex: "#5E5A54", ink: "#FFFFFF" },
  { name: "Line", hex: "#DDD9D0", ink: "#1C1B19" },
  { name: "Accent", hex: "#0C5E52", ink: "#FFFFFF" },
];

const typeSizes = [
  { label: "Display, 40px desktop, 32px mobile", className: "x-display", text: "Know the lot" },
  { label: "Section, 24px", className: "x-h2", text: "Section heading" },
  { label: "Card title, 18px", className: "x-h3", text: "Card title" },
  { label: "Body, 16px", className: "", text: "Body text for specs, results, and requests." },
  { label: "Label, 14px", className: "x-note", text: "Secondary label" },
  { label: "Meta, 12px", className: "x-kicker", text: "Meta label" },
];

export default function DesignSystemPage() {
  const lot = exampleLots[0];
  return (
    <ExchangeShell current="/design-system">
      <main id="main-content">
        <div className="x-wrap">
          <p className="x-kicker">Design system</p>
          <h1 className="x-display">Lab grade, one accent</h1>
          <p className="x-lead">
            One neutral palette, one accent, Inter, an 8px spacing grid, and soft 1px borders. No photographs, gradients, or illustrations. Empty slots stay empty.
          </p>

          <section className="x-section" id="colors" aria-labelledby="colors-heading">
            <h2 id="colors-heading">Colors</h2>
            <ul className="x-swatches">
              {colors.map((color) => (
                <li key={color.hex} className="x-swatch">
                  <i style={{ background: color.hex, color: color.ink }} />
                  <span>
                    {color.name}
                    <br />
                    {color.hex}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="x-section" id="type" aria-labelledby="type-heading">
            <h2 id="type-heading">Type</h2>
            <ul className="x-type-list">
              {typeSizes.map((item) => (
                <li key={item.label}>
                  <small>{item.label}</small>
                  <p className={item.className}>{item.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="x-section" id="buttons" aria-labelledby="buttons-heading">
            <h2 id="buttons-heading">Buttons</h2>
            <div className="x-button-row">
              <button className="x-btn" type="button">
                Primary button
              </button>
              <button className="x-btn-secondary" type="button">
                Secondary button
              </button>
              <a className="x-text-link" href="#colors">
                Text link
              </a>
            </div>
          </section>

          <section className="x-section" id="search" aria-labelledby="search-heading">
            <h2 id="search-heading">Search bar</h2>
            <SearchForm />
          </section>

          <section className="x-section" id="supplier-card" aria-labelledby="card-heading">
            <h2 id="card-heading">Supplier card</h2>
            <div className="x-card-grid">
              <SupplierCard />
            </div>
          </section>

          <section className="x-section" id="tabs" aria-labelledby="tabs-heading">
            <h2 id="tabs-heading">Tabs</h2>
            <div className="x-tabs">
              <span>Overview</span>
              <span>
                Products <span className="x-count">1</span>
              </span>
              <span>
                Lots <span className="x-count">0</span>
              </span>
              <span>
                Documents <span className="x-count">0</span>
              </span>
              <span>
                Certifications <span className="x-count">0</span>
              </span>
            </div>
          </section>

          <section className="x-section" id="badge" aria-labelledby="badge-heading">
            <h2 id="badge-heading">Badge</h2>
            <div className="x-badge-row">
              <Badge tone="accent">EXAMPLE</Badge>
              <Badge>Supplier-reported</Badge>
              <Badge tone="accent">Not detected</Badge>
              <Badge tone="accent">Meets your limit</Badge>
              <Badge>Public</Badge>
            </div>
          </section>

          <section className="x-section" id="results" aria-labelledby="results-heading">
            <h2 id="results-heading">Results table</h2>
            {lot ? <ResultsTable lot={lot} /> : null}
          </section>

          <section className="x-section" id="price" aria-labelledby="price-heading">
            <h2 id="price-heading">Price tag</h2>
            <div className="x-facts">
              <PriceTag mode="hidden" />
              <PriceTag mode="example" />
            </div>
          </section>

          <section className="x-section" id="compare" aria-labelledby="compare-heading">
            <h2 id="compare-heading">Compare</h2>
            <CompareSpecimen />
          </section>

          <section className="x-section" id="sign-in" aria-labelledby="signin-specimen">
            <h2 id="signin-specimen">Sign-in screen</h2>
            <EmailSignInScreen heading="h2" />
          </section>

          <section className="x-section" aria-labelledby="slot-heading">
            <h2 id="slot-heading">Photo slot</h2>
            <PhotoSlot />
          </section>
        </div>
      </main>
    </ExchangeShell>
  );
}
