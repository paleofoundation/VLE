import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { kasandrinosPreviewEnabled } from "@/domain/kasandrinos-preview-path";
import { getPreviewBrand } from "@/domain/kasandrinos-preview";
import { PreviewTour } from "../ui";

export const metadata: Metadata = { title: "Preview: Kasandrinos operations" };

export default function PreviewOpsPage() {
  if (!kasandrinosPreviewEnabled()) notFound();
  const brand = getPreviewBrand();
  return (
    <main id="main-content" className="opsPage previewPage">
      <section className="opsHero">
        <div>
          <p className="eyebrow">Preview operations view</p>
          <h1>Kasandrinos records</h1>
          <p className="sectionLead">No database rows were written. These cards show where each named lot honestly sits. Actions that would verify inventory, sample, qualify, or publish are not available here.</p>
        </div>
      </section>

      <section className="opsMetrics" aria-label="Preview pipeline summary">
        <div><span>Named lots</span><strong>02</strong><small>Neither one is created</small></div>
        <div><span>Reached nomination</span><strong>00</strong><small>Stopped before that state</small></div>
        <div><span>Public shelf</span><strong>00</strong><small>Nothing is listed</small></div>
        <div><span>Pending lot ids</span><strong>{brand.pending.length.toString().padStart(2, "0")}</strong><small>July 2025 certificates</small></div>
      </section>

      <section className="opsBoard" aria-labelledby="pipeline-heading">
        <div className="boardHeading">
          <div><p className="eyebrow">Not a live queue</p><h2 id="pipeline-heading">Certificate lots</h2></div>
          <p>Open a lot to see the state rail and the next blocked step.</p>
        </div>
        <div className="opsLotList">
          {brand.lots.map((lot) => (
            <article className="opsLotRow tone-attention" key={lot.slug}>
              <div className="opsLotIdentity">
                <div className="opsLotFlags"><span className="stateChip">Not created</span></div>
                <p className="productLabel">{lot.productName}</p>
                <h3>{lot.supplierLotCode}</h3>
                <p>Test {lot.test} · order {lot.order} · {lot.assay}</p>
              </div>
              <div className="opsLotInventory">
                <span>Inventory</span>
                <strong>Not recorded</strong>
                <small>Quantity and location are absent</small>
              </div>
              <div className="opsLotProgress">
                <div><span>Before nomination</span><span>0 of 7</span></div>
                <div className="progressTrack"><i style={{ width: "0%" }} /></div>
                <strong>Next step: nomination</strong>
                <p>{lot.heavyMetalPanelOnCertificate ? "Heavy-metals panel is on the certificate only." : "Aluminum only. Heavy-metal status is not claimable."}</p>
              </div>
              <Link className="openLot" href={lot.opsPath}><span>Open workflow</span><span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </section>
      <PreviewTour current="/preview/kasandrinos/ops" />
    </main>
  );
}
