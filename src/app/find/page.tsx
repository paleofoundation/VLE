import Link from "next/link";
import { getCurrentActor } from "@/lib/current-actor";
import { getCocoaReferenceData } from "@/services/vle";
import { createRequirementAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FindPage({ searchParams }: PageProps<"/find">) {
  const actor = await getCurrentActor();
  if (!actor.roles.some((role) => role === "BUYER" || role === "ADMIN")) {
    return (
      <main id="main-content" className="accessPage">
        <div className="accessCard"><span className="mono">AUTHZ / BUYER</span><h1>Buyer access required.</h1><p>Switch to a VLE buyer organization membership to record a cocoa powder requirement.</p><Link className="textLink" href="/">Return to the public shelf</Link></div>
      </main>
    );
  }

  const { product, profile } = await getCocoaReferenceData();
  const { created } = await searchParams;
  if (!product || !profile) {
    return <main id="main-content" className="accessPage"><div className="accessCard"><span className="mono">PILOT / SETUP</span><h1>Cocoa reference data is not loaded.</h1><p>Run the Phase A seed before recording a requirement.</p></div></main>;
  }

  return (
    <main id="main-content" className="findPage">
      <section className="findIntro">
        <p className="eyebrow eyebrowLight">Buyer intake · Cocoa powder pilot</p>
        <h1>Find me a passing lot.</h1>
        <p className="heroLead">Tell VLE what must pass, how much you need, and where it needs to go. The requirement stays bound to one frozen profile version while VLE checks eligible public lots.</p>
        <div className="intakeBoundary">
          <span className="mono">SCOPE / NOW</span>
          <p><strong>Matching is eligibility-bound.</strong> This intake creates a BuyerRequirement. Ops may match it only to a currently LISTED, QUALIFIED cocoa lot on the same frozen profile. It does not create a quote, reservation intent, Order, or guarantee of supply.</p>
        </div>
        <ol className="intakeSteps">
          <li><span>01</span><div><strong>Record the requirement</strong><p>Quantity, destination, timing, and named profile.</p></div></li>
          <li><span>02</span><div><strong>Preserve the standard</strong><p>The request stays bound to Cocoa Profile v{profile.version}.</p></div></li>
          <li><span>03</span><div><strong>Match the live shelf</strong><p>VLE operations checks only currently eligible public lots.</p></div></li>
        </ol>
      </section>

      <section className="intakePanel" aria-labelledby="intake-heading">
        <div className="intakePanelHead">
          <div><p className="eyebrow">Requirement record</p><h2 id="intake-heading">Buyer need</h2></div>
          <span className="stateChip state-qualified">Profile frozen</span>
        </div>
        {created ? <div className="success" role="status" aria-live="polite"><strong>Requirement recorded.</strong><span>Continue in the buyer desk while VLE operations runs eligible matching.</span></div> : null}
        <form action={createRequirementAction} className="formCard">
          <input type="hidden" name="productTypeId" value={product.id} />
          <input type="hidden" name="profileVersionId" value={profile.id} />
          <div className="formRow">
            <label>Ingredient<input value="Cocoa powder" readOnly /></label>
            <label>Compliance profile<input value={`Cocoa Profile v${profile.version}`} readOnly /></label>
          </div>
          <div className="formRow">
            <label>Required quantity <span>kg</span><input name="quantity" type="number" min="1" step="1" inputMode="decimal" required placeholder="5,000" /></label>
            <label>Destination<input name="destination" required minLength={2} maxLength={160} autoComplete="shipping locality" placeholder="City, country" /></label>
          </div>
          <label>Requirement notes <span>optional</span><textarea name="notes" rows={5} maxLength={1000} placeholder="Timing, handling, packaging, or procurement context" /></label>
          <div className="formSubmit">
            <p>Submitting records a requirement only. Matches, quotes, reservation intents, and Orders remain distinct records.</p>
            <button className="button" type="submit">Record buyer requirement</button>
          </div>
        </form>
      </section>
    </main>
  );
}
