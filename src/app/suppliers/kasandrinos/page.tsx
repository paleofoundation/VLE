import Link from "next/link";
import { ExchangeShell } from "@/exchange/shell";
import { BrandLimits } from "@/exchange/brand-limits";
import { ProfileClaims } from "@/exchange/claims";
import { ConfirmUpload } from "@/exchange/confirm-upload";
import { RequestDock } from "@/exchange/request-dock";
import { FileSlot, LabPending, PhotoSlot, ProfileTabs } from "@/exchange/ui";
import { formatSizes, kasandrinos } from "@/exchange/example-data";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata(
  "/suppliers/kasandrinos",
  "Kasandrinos | VLE",
  "Kasandrinos Organic Extra Virgin Olive Oil from Greece. Sizes and description from kasandrinos.com. Lab results pending.",
);

export default function KasandrinosPage() {
  return (
    <ExchangeShell dock current="/suppliers">
      <main id="main-content">
        <div className="x-wrap">
          <div className="x-profile">
            <div>
              <ProfileTabs />
              <section id="overview" className="x-anchor" aria-labelledby="profile-heading">
                <PhotoSlot />
                <p className="x-kicker">{kasandrinos.vendor}</p>
                <h1 id="profile-heading" className="x-display">
                  {kasandrinos.name}
                </h1>
                <p className="x-lead">{kasandrinos.description}</p>
                <dl className="x-spec">
                  <div>
                    <dt>Makes</dt>
                    <dd>{kasandrinos.makes}</dd>
                  </div>
                  <div>
                    <dt>Origin</dt>
                    <dd>{kasandrinos.origin}</dd>
                  </div>
                  <div>
                    <dt>Olives</dt>
                    <dd>{kasandrinos.olives}</dd>
                  </div>
                  <div>
                    <dt>Process</dt>
                    <dd>{kasandrinos.process}</dd>
                  </div>
                  <div>
                    <dt>Sizes</dt>
                    <dd>{formatSizes(kasandrinos.sizes)}</dd>
                  </div>
                </dl>
                <p className="x-note">Product name, origin, sizes, and description are from kasandrinos.com. Empty fields stay hidden.</p>
              </section>

              <section id="products" className="x-section x-anchor" aria-labelledby="products-heading">
                <h2 id="products-heading">Products</h2>
                <article className="x-card">
                  <PhotoSlot />
                  <div className="x-card-body">
                    <h3 className="x-h3">
                      <Link className="x-text-link" href={kasandrinos.productPath}>
                        {kasandrinos.productName}
                      </Link>
                    </h3>
                    <p>{kasandrinos.description}</p>
                  </div>
                </article>
              </section>

              <section id="lots" className="x-section x-anchor" aria-labelledby="lots-heading">
                <h2 id="lots-heading">Lots</h2>
                <LabPending />
                <BrandLimits />
                <div className="x-section">
                  <ConfirmUpload />
                </div>
              </section>

              <section id="documents" className="x-section x-anchor" aria-labelledby="documents-heading">
                <h2 id="documents-heading">Documents</h2>
                <p>Documents are open to everyone. They are never behind sign-in. Request a document from the request panel. The record itself stays public.</p>
                <p>No documents are on file.</p>
                <FileSlot />
              </section>

              <section id="certifications" className="x-section x-anchor" aria-labelledby="certs-heading">
                <h2 id="certifications-heading">Certifications</h2>
                <p>Supplier-reported unless confirmed by the issuing body.</p>
                <p>No certifications are on file.</p>
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
