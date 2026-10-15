import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { kasandrinosPreviewEnabled } from "@/domain/kasandrinos-preview-path";
import { getPreviewLot } from "@/domain/kasandrinos-preview";
import { AnalyteTable, LotStateRail, MissingFacts, PreviewTour } from "../../ui";

type LotPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: LotPageProps): Promise<Metadata> {
  if (!kasandrinosPreviewEnabled()) return { title: "Not found", robots: { index: false, follow: false } };
  const lot = getPreviewLot((await params).slug);
  return { title: lot ? `Preview: Lot ${lot.supplierLotCode}` : "Preview unavailable" };
}

export default async function PreviewLotPage({ params }: LotPageProps) {
  if (!kasandrinosPreviewEnabled()) notFound();
  const lot = getPreviewLot((await params).slug);
  if (!lot) notFound();
  return (
    <main id="main-content" className="lotDetailPage previewPage">
      <div className="detailBreadcrumb">
        <Link className="back" href="/preview/kasandrinos">Kasandrinos</Link>
        <span aria-hidden="true">/</span>
        <span>{lot.supplierLotCode}</span>
      </div>
      <p className="eyebrow">{lot.productName}</p>
      <h1>Lot {lot.supplierLotCode}</h1>
      <p className="sectionLead">{lot.lotState}. {lot.nextStep}</p>

      <section className="previewCallout" aria-labelledby="state-heading">
        <p className="eyebrow">Where this lot sits</p>
        <h2 id="state-heading">Stopped before nomination</h2>
        <p>{lot.nextStep}</p>
      </section>

      <LotStateRail steps={lot.rail} />

      <section className="detailFacts" aria-labelledby="facts-heading">
        <div className="detailSectionHeading">
          <p className="eyebrow">Not invented</p>
          <h2 id="facts-heading">Nomination facts still missing</h2>
        </div>
        <MissingFacts />
      </section>

      <section className="detailFacts" aria-labelledby="evidence-heading">
        <div className="detailSectionHeading">
          <p className="eyebrow">Light Labs certificate</p>
          <h2 id="evidence-heading">Test {lot.test}, order {lot.order}</h2>
          <p>{lot.assay}. Method {lot.method}. Received {lot.dateReceived}, tested {lot.dateTested}, released {lot.dateReleasedAsPrinted}. Approved by {lot.approvedByLine}. Serving size {lot.servingSize}.</p>
          {lot.heavyMetalPanelOnCertificate ? <p>The heavy-metals panel is on this certificate. VLE heavy-metal status is not claimable.</p> : <p>This certificate has no arsenic, cadmium, lead, or mercury result. Heavy-metal status is not claimable.</p>}
          {lot.resultColumnNote ? <p>{lot.resultColumnNote}</p> : null}
        </div>
        <AnalyteTable rows={lot.analytes} />
        {lot.methodStatement ? <details className="previewDetails"><summary>Method statement printed on the certificate</summary><p>{lot.methodStatement}</p></details> : null}
      </section>

      <section className="detailFacts" aria-labelledby="pdf-heading">
        <div className="detailSectionHeading">
          <p className="eyebrow">Certificate file</p>
          <h2 id="pdf-heading">{lot.fileName}</h2>
          <p>Sha256 {lot.sha256}. This file is served only from the preview. It is not a TECRID record and it is not stored as a database artifact.</p>
        </div>
        <p><a className="button buttonDark" href={lot.pdfHref}>Open the Light Labs PDF</a></p>
        <iframe className="pdfFrame" title={`Light Labs certificate ${lot.fileName}`} src={lot.pdfHref} />
      </section>

      <p className="previewNote"><Link className="textLink" href={lot.opsPath}>Open the operations view for this lot</Link></p>
      <PreviewTour current={lot.path} />
    </main>
  );
}
