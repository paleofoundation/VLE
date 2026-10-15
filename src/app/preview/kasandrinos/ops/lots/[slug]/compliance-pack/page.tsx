import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { kasandrinosPreviewEnabled } from "@/domain/kasandrinos-preview-path";
import { buildKasandrinosCompliancePack, getPreviewLot } from "@/domain/kasandrinos-preview";
import { PreviewTour } from "../../../../ui";

type PackPageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Preview: Compliance pack for lot 227 K/B" };

export default async function PreviewCompliancePackPage({ params }: PackPageProps) {
  if (!kasandrinosPreviewEnabled()) notFound();
  const { slug } = await params;
  if (slug !== "227-k-b" || !getPreviewLot(slug)) notFound();
  const pack = buildKasandrinosCompliancePack();
  const reasons = pack.statusAtExport.publicationGateEligible ? [] : pack.statusAtExport.publicationGateReasons;
  return (
    <main id="main-content" className="opsDetailPage previewPage">
      <div className="detailBreadcrumb">
        <Link className="back" href="/preview/kasandrinos/ops/lots/227-k-b">Lot 227 K/B workflow</Link>
        <span aria-hidden="true">/</span>
        <span>Compliance pack</span>
      </div>
      <p className="eyebrow">Checksummed snapshot</p>
      <h1>Compliance pack for 227 K/B</h1>
      <p className="sectionLead">{pack.snapshotBoundary.statement} {pack.statusAtExport.lotState}.</p>

      <dl className="factGrid previewFacts">
        <div><dt>Lot state</dt><dd>{pack.statusAtExport.lotState}</dd></div>
        <div><dt>Listed</dt><dd>No</dd></div>
        <div><dt>Qualified</dt><dd>No</dd></div>
        <div><dt>Permitted claim</dt><dd>None</dd></div>
        <div><dt>Samples</dt><dd>{pack.samples.length}</dd></div>
        <div><dt>TECRID records</dt><dd>{pack.tecridEvidence.length}</dd></div>
        <div><dt>Decisions</dt><dd>{pack.qualificationDecisions.length}</dd></div>
        <div><dt>Audit events</dt><dd>{pack.auditTrail.events.length}</dd></div>
      </dl>

      <section className="previewCallout" aria-labelledby="gate-heading">
        <h2 id="gate-heading">Publication gate is closed</h2>
        <ul>
          {reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
        <p>{pack.statusAtExport.nextStep}</p>
      </section>

      <section className="detailFacts" aria-labelledby="withheld-heading">
        <h2 id="withheld-heading">Certificates left off this lot</h2>
        <ul className="previewPending">
          {pack.notAttached.map((item) => (
            <li key={item.test}><strong>Test {item.test}</strong><span>{item.productName}</span><span>{item.reason}</span></li>
          ))}
        </ul>
      </section>

      <p>
        {/* File download, not an in-app page transition. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="button buttonDark" href="/preview/kasandrinos/ops/lots/227-k-b/compliance-pack/download">Download the JSON pack</a>
      </p>
      <details className="previewDetails">
        <summary>Show the JSON snapshot</summary>
        <pre className="previewJson">{JSON.stringify(pack, null, 2)}</pre>
      </details>
      <p className="previewNote">Checksum {pack.checksum.algorithm} {pack.checksum.payloadDigest}. {pack.checksum.limitation}</p>
      <PreviewTour current="/preview/kasandrinos/ops/lots/227-k-b/compliance-pack" />
    </main>
  );
}
