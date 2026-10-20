import Link from "next/link";
import type { Metadata } from "next";
import { ExchangeShell } from "@/exchange/shell";
import { BrandLimits } from "@/exchange/brand-limits";
import { CompareBoard } from "@/exchange/compare";
import { RequestDock } from "@/exchange/request-dock";
import { Badge, PriceTag } from "@/exchange/ui";
import { exampleLots, exampleSupplier } from "@/exchange/example-data";
import { SITE_URL } from "@/lib/site";

const path = "/suppliers/kasandrinos/extra-virgin-olive-oil";

export const metadata: Metadata = {
  title: "EXAMPLE extra virgin olive oil | Kasandrinos | VLE",
  description: "Example product page. The spec sheet and lot results are placeholder data marked EXAMPLE.",
  robots: { index: true, follow: true },
  alternates: { canonical: `${SITE_URL}${path}` },
};

const spec = [
  ["Product", exampleSupplier.productName],
  ["Category", exampleSupplier.categoryLabel],
  ["Supplier", exampleSupplier.name],
  ["Form", exampleSupplier.form],
  ["Process", exampleSupplier.process],
  ["Pack", exampleSupplier.pack],
  ["Shelf life", exampleSupplier.shelfLife],
  ["Storage", exampleSupplier.storage],
  ["MOQ (minimum order)", exampleSupplier.moq],
  ["Lead time", exampleSupplier.leadTime],
  ["Volumes", exampleSupplier.volumes],
  ["Markets", exampleSupplier.markets],
] as const;

export default function ExtraVirginOliveOilPage() {
  return (
    <ExchangeShell dock>
      <main id="main-content">
        <div className="x-wrap">
          <p className="x-banner" role="note">
            <strong>Example product.</strong> Every number and lab result on this page is placeholder data marked EXAMPLE.
          </p>
          <p className="x-kicker">
            <Link className="x-text-link" href={exampleSupplier.path}>
              {exampleSupplier.name}
            </Link>
          </p>
          <div className="x-profile">
            <div>
              <h1 className="x-display">{exampleSupplier.productName}</h1>
              <p className="x-lead">Spec sheet. Not a marketing blurb.</p>
              <div className="x-facts">
                <PriceTag mode="hidden" />
                <div>
                  <p className="x-price-label">MOQ (minimum order)</p>
                  <p>{exampleSupplier.moq}</p>
                </div>
                <div>
                  <p className="x-price-label">Lead time</p>
                  <p>{exampleSupplier.leadTime}</p>
                </div>
              </div>
              <section className="x-section" aria-labelledby="spec-heading">
                <h2 id="spec-heading">Spec sheet</h2>
                <dl className="x-spec">
                  {spec.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section className="x-section" aria-labelledby="product-lots">
                <h2 id="product-lots">
                  Lot results <Badge tone="accent">EXAMPLE</Badge>
                </h2>
                <BrandLimits lots={exampleLots} />
              </section>
              <CompareBoard
                options={exampleLots.map((lot) => ({
                  id: lot.id,
                  title: lot.name,
                  rows: [
                    { label: "Analyte", value: lot.results[0]?.analyte ?? "" },
                    { label: "Value", value: lot.results[0]?.value ?? "" },
                    { label: "Plain words", value: lot.results[0]?.plain ?? "" },
                    { label: "Lab", value: lot.results[0]?.lab ?? "" },
                    { label: "Date", value: lot.results[0]?.date ?? "" },
                  ],
                }))}
              />
            </div>
            <RequestDock />
          </div>
        </div>
      </main>
    </ExchangeShell>
  );
}
