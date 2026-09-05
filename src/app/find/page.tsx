import { getCurrentActor } from "@/lib/current-actor";
import { getCocoaReferenceData } from "@/services/vle";
import { createRequirementAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FindPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const actor = await getCurrentActor();
  if (!actor.roles.some((role) => role === "BUYER" || role === "ADMIN")) {
    return <main className="narrow"><div className="notice"><strong>Buyer access required</strong><p>Switch to a VLE buyer organization membership to create a requirement.</p></div></main>;
  }
  const { product, profile } = await getCocoaReferenceData(); const created = (await searchParams).created;
  if (!product || !profile) return <main className="narrow"><p>Run the Phase A seed first.</p></main>;
  return <main className="narrow formPage"><p className="eyebrow">Phase B intake stub</p><h1>Find me a passing lot.</h1><p className="lede compact">Capture a buyer requirement now. Matching, quotes, and reservation intent are deliberately deferred.</p>{created && <div className="success">Requirement recorded for managed follow-up.</div>}<form action={createRequirementAction} className="formCard"><input type="hidden" name="productTypeId" value={product.id} /><input type="hidden" name="profileVersionId" value={profile.id} /><label>Ingredient<input value="Cocoa powder" readOnly /></label><label>Compliance profile<input value={`Cocoa Profile v${profile.version}`} readOnly /></label><label>Quantity (kg)<input name="quantity" type="number" min="1" step="1" required /></label><label>Destination<input name="destination" required placeholder="City, country" /></label><label>Notes<textarea name="notes" rows={4} placeholder="Timing or handling notes" /></label><button className="button" type="submit">Create buyer requirement</button></form></main>;
}
