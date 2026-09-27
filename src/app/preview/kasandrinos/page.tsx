import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { kasandrinosPreviewEnabled } from "@/domain/kasandrinos-preview-path";
import { getPreviewBrand } from "@/domain/kasandrinos-preview";
import { PreviewTour } from "./ui";

export const metadata: Metadata = { title: "Preview: Kasandrinos brand profile" };

export default function KasandrinosBrandPage() {
  if (!kasandrinosPreviewEnabled()) notFound();
  const brand = getPreviewBrand();
  const primary = brand.lots[0];
  const secondary = brand.lots[1];
  return (
    <main id="main-content" className="lotDetailPage previewPage">
      <p className="eyebrow">Brand on the certificates</p>
      <h1>{brand.customer}</h1>
      <p className="sectionLead">This is the customer named on the Light Labs certificates. VLE does not yet have a supplier organization, a stocked location, or an owner of record for these lots.</p>

      <section className="detailFacts" aria-labelledby="brand-facts-heading">
        <div className="detailSectionHeading">
          <p className="eyebrow">What the certificates say</p>
          <h2 id="brand-facts-heading">Known identity</h2>
        </div>
        <dl className="factGrid previewFacts">
          <div><dt>Customer</dt><dd>{brand.customer}</dd></div>
          <div><dt>Customer email</dt><dd>{brand.customerEmail}</dd></div>
          <div><dt>Supplier organization</dt><dd>Not created</dd></div>
          <div><dt>Owner of record</dt><dd>Not on the certificate</dd></div>
          <div><dt>Laboratory</dt><dd>{brand.issuer}</dd></div>
          <div><dt>Lab contact</dt><dd>{brand.labContact}</dd></div>
          <div><dt>Lab address</dt><dd>{brand.labAddress}</dd></div>
          <div><dt>Result confirmation</dt><dd>{brand.confirmation.by}: {brand.confirmation.statement}</dd></div>
        </dl>
        <p className="previewNote">That confirmation does not fill the owner-of-record field and does not nominate a lot.</p>
      </section>

      <section className="detailFacts" aria-labelledby="named-lots-heading">
        <div className="detailSectionHeading">
          <p className="eyebrow">Named lots</p>
          <h2 id="named-lots-heading">Two lot codes, neither created</h2>
        </div>
        <div className="previewCards">
          <article>
            <p className="eyebrow">Primary lot</p>
            <h3>{primary.supplierLotCode}</h3>
            <p>{primary.productName}. Test {primary.test}, order {primary.order}. Heavy-metals panel is on the certificate and is not a VLE claim.</p>
            <p>{primary.lotState}</p>
            <Link className="button buttonDark" href={primary.path}>Open lot {primary.supplierLotCode}</Link>
          </article>
          <article>
            <p className="eyebrow">Second lot</p>
            <h3>{secondary.supplierLotCode}</h3>
            <p>{secondary.productName}. Test {secondary.test}, order {secondary.order}. Aluminum only. It cannot claim heavy-metal status.</p>
            <p>{secondary.lotState}</p>
            <Link className="textLink" href={secondary.path}>Open lot {secondary.supplierLotCode}</Link>
          </article>
        </div>
      </section>

      <section className="detailFacts" aria-labelledby="pending-heading">
        <div className="detailSectionHeading">
          <p className="eyebrow">July 2025, order 1670</p>
          <h2 id="pending-heading">Waiting on supplier lot ids</h2>
          <p>The lot field is blank on each of these certificates. They are not attached to 227 K/B or 228 K/B. There is no product-testing-history table to store them on.</p>
        </div>
        <ul className="previewPending">
          {brand.pending.map((certificate) => (
            <li key={certificate.test}>
              <strong>Test {certificate.test}</strong>
              <span>{certificate.productName} · {certificate.assay}</span>
              <span>Received {certificate.dateReceived}, tested {certificate.dateTested}, released {certificate.dateReleasedAsPrinted}</span>
              {certificate.pdfHref ? <a className="textLink" href={certificate.pdfHref}>Open the certificate PDF</a> : null}
            </li>
          ))}
        </ul>
      </section>

      <PreviewTour current="/preview/kasandrinos" />
    </main>
  );
}
