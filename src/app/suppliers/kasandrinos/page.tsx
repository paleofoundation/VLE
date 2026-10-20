import Link from "next/link";
import { ExchangeShell } from "@/exchange/shell";
import { BrandLimits } from "@/exchange/brand-limits";
import { ProfileClaims } from "@/exchange/claims";
import { ConfirmUpload } from "@/exchange/confirm-upload";
import { RequestDock } from "@/exchange/request-dock";
import { Badge, FileSlot, PhotoSlot, PriceTag, ProfileTabs } from "@/exchange/ui";
import { exampleCertifications, exampleDocuments, exampleLots, exampleSupplier } from "@/exchange/example-data";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata(
  "/suppliers/kasandrinos",
  "Kasandrinos example supplier profile | VLE",
  "Example supplier profile. Every number, price, lot, lab result, and certificate on this page is marked EXAMPLE.",
);

export default function KasandrinosPage() {
  return (
    <ExchangeShell dock current="/suppliers">
      <main id="main-content">
        <div className="x-wrap">
          <p className="x-banner" role="note" data-testid="example-banner">
            <strong>Example profile.</strong> Every number, price, lot, lab result, and certificate on this page is placeholder data marked EXAMPLE. It is not a record from a real lot.
          </p>
          <div className="x-profile">
            <div>
              <ProfileTabs />
              <section id="overview" className="x-anchor" aria-labelledby="profile-heading">
                <PhotoSlot />
                <p className="x-kicker">Example supplier</p>
                <h1 id="profile-heading" className="x-display">
                  {exampleSupplier.name}
                </h1>
                <p className="x-lead">Extra virgin olive oil. The facts below are EXAMPLE values so the profile layout can be reviewed.</p>
                <dl className="x-spec">
                  <div>
                    <dt>Makes</dt>
                    <dd>{exampleSupplier.makes}</dd>
                  </div>
                  <div>
                    <dt>Volumes</dt>
                    <dd>{exampleSupplier.volumes}</dd>
                  </div>
                  <div>
                    <dt>Markets</dt>
                    <dd>{exampleSupplier.markets}</dd>
                  </div>
                  <div>
                    <dt>Country</dt>
                    <dd>{exampleSupplier.countryLabel}</dd>
                  </div>
                </dl>
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
              </section>

              <section id="products" className="x-section x-anchor" aria-labelledby="products-heading">
                <h2 id="products-heading">Products</h2>
                <article className="x-card">
                  <div className="x-card-body">
                    <Badge tone="accent">EXAMPLE</Badge>
                    <h3 className="x-h3">
                      <Link className="x-text-link" href={exampleSupplier.productPath}>
                        {exampleSupplier.productName}
                      </Link>
                    </h3>
                    <p>Structured spec sheet and EXAMPLE lot results.</p>
                  </div>
                </article>
              </section>

              <section id="lots" className="x-section x-anchor" aria-labelledby="lots-heading">
                <h2 id="lots-heading">Lots</h2>
                <p>Each lot has a results table: analyte, value, unit, limit, method, lab, date, and plain words.</p>
                <BrandLimits lots={exampleLots} />
                <div className="x-section">
                  <ConfirmUpload />
                </div>
              </section>

              <section id="documents" className="x-section x-anchor" aria-labelledby="documents-heading">
                <h2 id="documents-heading">Documents</h2>
                <p>Documents are open to everyone. They are never behind sign-in. Request a document from the request panel. The record itself stays public.</p>
                <ul className="x-doc-list">
                  {exampleDocuments.map((document) => (
                    <li key={document.id} className="x-doc">
                      <p className="x-badge">Public</p>
                      <h3 className="x-h3">{document.name}</h3>
                      <p>{document.date}</p>
                      <p>Document age {document.age}</p>
                      <FileSlot />
                    </li>
                  ))}
                </ul>
              </section>

              <section id="certifications" className="x-section x-anchor" aria-labelledby="certs-heading">
                <h2 id="certifications-heading">Certifications</h2>
                <p>Supplier-reported unless confirmed by the issuing body. These example items are not confirmed.</p>
                <ul className="x-cert-list">
                  {exampleCertifications.map((item) => (
                    <li key={item.id} className="x-cert">
                      <h3 className="x-h3">{item.name}</h3>
                      <p>
                        <Badge>Supplier-reported</Badge>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
              <ProfileClaims />
            </div>
            <RequestDock />
          </div>
        </div>
      </main>
    </ExchangeShell>
  );
}
