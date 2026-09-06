import Link from "next/link";
import { getCurrentActor } from "@/lib/current-actor";
import { formatQuantity } from "@/lib/presentation";
import { getNominationIntakeData } from "@/services/vle";
import { saveNominationDraftAction } from "../actions";

export const dynamic = "force-dynamic";

type NominationPageProps = {
  searchParams: Promise<{ edit?: string | string[]; saved?: string | string[]; mode?: string | string[] }>;
};

export default async function NominationPage({ searchParams }: NominationPageProps) {
  const actor = await getCurrentActor();
  if (!actor.roles.some((role) => role === "OPS" || role === "ADMIN")) {
    return <main id="main-content" className="accessPage"><div className="accessCard"><span className="mono">AUTHZ / OPS</span><h1>Operations access required.</h1><p>Your active VLE organization membership cannot manage supplier nominations.</p><Link className="textLink" href="/">Return to the public shelf</Link></div></main>;
  }

  const [{ edit, saved, mode }, intake] = await Promise.all([searchParams, getNominationIntakeData()]);
  const editId = typeof edit === "string" ? edit : undefined;
  const savedId = typeof saved === "string" ? saved : undefined;
  const savedMode = mode === "updated" ? "updated" : "created";
  const draft = editId ? intake.drafts.find((item) => item.id === editId) : undefined;
  const defaultSupplier = draft?.supplierOrganizationId ?? intake.suppliers[0]?.id ?? "";
  const defaultProduct = draft?.productTypeId ?? intake.products.find((item) => item.code === "COCOA_POWDER")?.id ?? intake.products[0]?.id ?? "";

  return (
    <main id="main-content" className="nominationPage">
      <div className="detailBreadcrumb"><Link className="back" href="/ops">Operations board</Link><span aria-hidden="true">/</span><span>Nomination intake</span></div>

      <section className="nominationHero">
        <div><p className="eyebrow">Managed supplier handoff</p><h1>Put the stocked lot on the rail.</h1><p className="sectionLead">Record the four supplier facts that identify inventory for operations: lot code, quantity, location, and the authorizer of record. Verification starts afterward.</p></div>
        <div className="nominationBoundary"><span className="mono">BOUNDARY / INTAKE</span><strong>Supplier report ≠ verified inventory</strong><p>Saving this form creates or corrects a private NOMINATED PhysicalLot draft. It does not create a Sample, TECRID evidence, QualificationDecision, or MarketplaceListing.</p></div>
      </section>

      {savedId ? <div className="success" role="status" aria-live="polite"><strong>Nomination {savedMode}.</strong><span>The lot remains private and unverified. Open it from the draft queue to begin the separate verification workflow.</span></div> : null}
      {editId && !draft ? <div className="nominationNotice" role="status"><strong>This lot is no longer an editable nomination draft.</strong><span>Once verification or sampling starts, its physical facts cannot be silently rewritten here.</span></div> : null}

      <div className="nominationLayout">
        <section className="nominationFormPanel" aria-labelledby="nomination-form-heading">
          <div className="nominationSectionHead"><div><p className="eyebrow">{draft ? "Correct draft" : "New nomination"}</p><h2 id="nomination-form-heading">Supplier-reported lot facts</h2></div><span className="stateChip">NOMINATED</span></div>
          {intake.suppliers.length && intake.products.length ? (
            <form action={saveNominationDraftAction} className="formCard nominationForm">
              {draft ? <input type="hidden" name="lotId" value={draft.id} /> : null}
              <div className="formRow">
                <label>Supplier organization<select name="supplierOrganizationId" required defaultValue={defaultSupplier}>{intake.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
                <label>Pilot lane<select name="productTypeId" required defaultValue={defaultProduct}>{intake.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
              </div>
              <label>Stocked lot code<input name="supplierLotCode" required minLength={2} maxLength={100} defaultValue={draft?.supplierLotCode ?? ""} placeholder="Supplier's physical inventory code" autoComplete="off" /></label>
              <div className="formRow">
                <label>Available quantity <span>kg</span><input name="quantity" type="number" min="0.001" max="1000000000" step="0.001" inputMode="decimal" required defaultValue={draft?.quantity ?? ""} placeholder="5,000" /></label>
                <label>Country code <span>ISO 2-letter</span><input name="countryCode" required minLength={2} maxLength={2} pattern="[A-Za-z]{2}" defaultValue={draft?.countryCode ?? ""} placeholder="EC" autoCapitalize="characters" /></label>
              </div>
              <label>Stocked location<input name="locationName" required minLength={2} maxLength={180} defaultValue={draft?.locationName ?? ""} placeholder="Warehouse or packhouse, city/region" /></label>
              <label>Supplier authorizer / owner of record<input name="ownerName" required minLength={2} maxLength={180} defaultValue={draft?.ownerName ?? ""} placeholder="Person or entity asserting authority to sell" /><small>Naming the source records the supplier&apos;s assertion. Ops must still verify authority to sell before sampling and publication.</small></label>
              <div className="formSubmit"><p>PDFs and COAs remain background artifacts. They cannot fill these fields or advance a compliance gate.</p><button className="button" type="submit">{draft ? "Save draft correction" : "Create nominated lot"}</button></div>
              {draft ? <Link className="textLink" href="/ops/nominations">Cancel edit</Link> : null}
            </form>
          ) : <div className="opsEmpty compact"><h3>Reference data required.</h3><p>Load an active pilot product and supplier organization before recording a nomination.</p></div>}
        </section>

        <aside className="nominationQueue" aria-labelledby="draft-queue-heading">
          <div className="nominationSectionHead"><div><p className="eyebrow">Private intake queue</p><h2 id="draft-queue-heading">Editable drafts</h2></div><strong>{intake.drafts.length.toString().padStart(2, "0")}</strong></div>
          <p className="nominationQueueIntro">Only untouched NOMINATED lots appear here. A draft leaves this correction queue as soon as inventory verification or sampling begins.</p>
          {intake.drafts.length ? <ol>{intake.drafts.map((item) => <li key={item.id} className={draft?.id === item.id ? "isEditing" : undefined}><div><span className="stateChip">NOMINATED</span><small>{item.product}</small></div><h3>{item.supplierLotCode}</h3><p>{item.supplier} · {formatQuantity(item.quantity)} {item.quantityUnit}</p><p>{item.locationName}, {item.countryCode} · {item.ownerName}</p><div className="nominationQueueActions"><Link className="textLink" href={`/ops/nominations?edit=${item.id}`}>Edit facts</Link><Link className="textLink" href={`/ops/lots/${item.id}`}>Open workflow</Link></div></li>)}</ol> : <div className="artifactEmpty"><strong>Waiting on supplier facts.</strong><p>When Marcus or another supplier provides a stocked lot code, quantity, location, and authorizer, record the private nomination here.</p></div>}
        </aside>
      </div>

      <section className="nominationTruth" aria-label="Nomination truth boundary"><div><span>01</span><strong>Nominate</strong><p>Four supplier-reported facts create the private draft.</p></div><div><span>02</span><strong>Verify</strong><p>Ops separately stamps identity, quantity, location, and authority.</p></div><div><span>03</span><strong>Sample</strong><p>A controlled SamplingOrder and distinct Sample bind evidence to the lot.</p></div><div><span>04</span><strong>Qualify</strong><p>Only current TECRID-linked evidence against a frozen profile can produce a decision.</p></div></section>
    </main>
  );
}
