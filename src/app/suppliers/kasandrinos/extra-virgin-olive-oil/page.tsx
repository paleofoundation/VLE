import Link from "next/link";
import type { Metadata } from "next";
import { ExchangeShell } from "@/exchange/shell";
import { BrandLimits } from "@/exchange/brand-limits";
import { CompareBoard } from "@/exchange/compare";
import { RequestDock } from "@/exchange/request-dock";
import { CoaSlot, DraftAwaitingCoa, LabPending, ProductPhotos } from "@/exchange/ui";
import { formatSizes, kasandrinos, kasandrinosLots, kasandrinosPhotos } from "@/exchange/example-data";
import { isPublishedProduct } from "@/exchange/listing";
import { SITE_URL } from "@/lib/site";

const path = "/suppliers/kasandrinos/extra-virgin-olive-oil";

export const metadata: Metadata = {
  title: "Kasandrinos Organic Extra Virgin Olive Oil | Kasandrinos | VLE",
  description: "Draft preview of Kasandrinos Organic Extra Virgin Olive Oil. Awaiting a COA attached to a specific lot. Not a published listing.",
  robots: isPublishedProduct(kasandrinosLots) ? { index: true, follow: true } : { index: false, follow: false },
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
          <DraftAwaitingCoa />
          <div className="x-profile">
            <div>
              <h1 className="x-display">{kasandrinos.productName}</h1>
              <ProductPhotos photos={kasandrinosPhotos} />
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
                <p className="x-note">Product name, origin, sizes, description, and photos are from kasandrinos.com.</p>
              </section>
              <section className="x-section" aria-labelledby="coa-heading">
                <h2 id="coa-heading">Certificate of analysis</h2>
                <p>A COA has to be attached to a specific lot before this product can be published. No COA is on file.</p>
                <CoaSlot />
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
