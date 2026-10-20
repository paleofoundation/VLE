import Link from "next/link";
import type { Metadata } from "next";
import { ExchangeShell } from "@/exchange/shell";
import { BrandLimits } from "@/exchange/brand-limits";
import { CompareBoard } from "@/exchange/compare";
import { RequestDock } from "@/exchange/request-dock";
import { LabPending, PhotoSlot } from "@/exchange/ui";
import { formatSizes, kasandrinos } from "@/exchange/example-data";
import { SITE_URL } from "@/lib/site";

const path = "/suppliers/kasandrinos/extra-virgin-olive-oil";

export const metadata: Metadata = {
  title: "Kasandrinos Organic Extra Virgin Olive Oil | Kasandrinos | VLE",
  description: "Kasandrinos Organic Extra Virgin Olive Oil from Greece. Sizes and description from kasandrinos.com. Lab results pending.",
  robots: { index: true, follow: true },
  alternates: { canonical: `${SITE_URL}${path}` },
};

const spec = [
  ["Product", kasandrinos.productName],
  ["Category", kasandrinos.categoryLabel],
  ["Supplier", kasandrinos.name],
  ["Company", kasandrinos.vendor],
  ["Origin", kasandrinos.origin],
  ["Olives", kasandrinos.olives],
  ["Process", kasandrinos.process],
  ["Sizes", formatSizes(kasandrinos.sizes)],
  ["Description", kasandrinos.description],
] as const;

export default function ExtraVirginOliveOilPage() {
  return (
    <ExchangeShell dock>
      <main id="main-content">
        <div className="x-wrap">
          <p className="x-kicker">
            <Link className="x-text-link" href={kasandrinos.path}>
              {kasandrinos.name}
            </Link>
          </p>
          <div className="x-profile">
            <div>
              <PhotoSlot />
              <h1 className="x-display">{kasandrinos.productName}</h1>
              <p className="x-lead">{kasandrinos.description}</p>
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
                <p className="x-note">Product name, origin, sizes, and description are from kasandrinos.com.</p>
              </section>
              <section className="x-section" aria-labelledby="product-lots">
                <h2 id="product-lots">Lot results</h2>
                <LabPending />
                <BrandLimits />
              </section>
              <CompareBoard options={[]} />
              <p className="x-note">No lots are on file to compare. Lab results pending.</p>
            </div>
            <RequestDock />
          </div>
        </div>
      </main>
    </ExchangeShell>
  );
}
