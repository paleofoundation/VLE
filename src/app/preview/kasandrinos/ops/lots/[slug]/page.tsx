import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { kasandrinosPreviewEnabled } from "@/domain/kasandrinos-preview-path";
import { getPreviewLot } from "@/domain/kasandrinos-preview";
import { LotStateRail, PreviewTour } from "../../../ui";

type OpsLotPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: OpsLotPageProps): Promise<Metadata> {
  if (!kasandrinosPreviewEnabled()) return { title: "Not found", robots: { index: false, follow: false } };
  const lot = getPreviewLot((await params).slug);
  return { title: lot ? `Preview: Operations ${lot.supplierLotCode}` : "Preview unavailable" };
}

export default async function PreviewOpsLotPage({ params }: OpsLotPageProps) {
  if (!kasandrinosPreviewEnabled()) notFound();
  const lot = getPreviewLot((await params).slug);
  if (!lot) notFound();
  const packHref = lot.slug === "227-k-b" ? "/preview/kasandrinos/ops/lots/227-k-b/compliance-pack" : null;
  return (
    <main id="main-content" className="opsDetailPage previewPage">
      <div className="detailBreadcrumb">
        <Link className="back" href="/preview/kasandrinos/ops">Operations preview</Link>
        <span aria-hidden="true">/</span>
        <span>{lot.supplierLotCode}</span>
      </div>
      <section className="opsDetailHero">
        <div>
          <div className="opsLotFlags"><span className="stateChip">Not created</span></div>
          <p className="eyebrow">{lot.productName} · {lot.assay}</p>
          <h1>{lot.supplierLotCode}</h1>
          <p className="sectionLead">{lot.lotState}. {lot.nextStep}</p>
        </div>
        <aside className="workflowSummary">
          <span>Truth spine</span>
          <strong>0 / 7</strong>
          <div className="progressTrack"><i style={{ width: "0%" }} /></div>
          <small>Publication gate is closed</small>
        </aside>
      </section>

      <LotStateRail steps={lot.rail} />

      <section className="artifactPanel" aria-labelledby="artifact-heading">
        <div className="artifactPanelHead">
          <div>
            <p className="eyebrow">Background file</p>
            <h2 id="artifact-heading">Certificate reference</h2>
            <p>The real operations log would store an http or https reference after a lot exists. This preview only points at the certificate file. It did not write a lot artifact, and it does not advance the lot.</p>
          </div>
        </div>
        <p><a className="textLink" href={lot.pdfHref}>{lot.fileName}</a></p>
        <p className="previewNote">Test {lot.test}. Document date on the certificate: {lot.dateReleasedAsPrinted}.</p>
      </section>

      {packHref ? (
        <section className="compliancePackPanel" aria-labelledby="pack-heading">
          <div className="compliancePackCopy">
            <p className="eyebrow">Preview snapshot</p>
            <h2 id="pack-heading">Compliance pack</h2>
            <p>The repository can build a checksummed pack for a stored physical lot. This preview builds the same envelope for lot 227 K/B and leaves every gate section empty, because the lot was not created.</p>
          </div>
          <p><Link className="button buttonDark" href={packHref}>Open the compliance pack</Link></p>
        </section>
      ) : (
        <section className="previewCallout">
          <h2>No heavy-metal pack</h2>
          <p>Lot 228 K/B has an aluminum certificate only. This preview does not invent a heavy-metals compliance pack for it.</p>
        </section>
      )}

      <PreviewTour current={lot.opsPath} />
    </main>
  );
}
