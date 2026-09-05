import Link from "next/link";
import { listPublicListings } from "@/services/vle";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const listings = await listPublicListings();
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Verified Lot Exchange</p>
        <h1>Buy the lot that<br />already passed.</h1>
        <p className="lede">Ingredient sourcing built around a frozen compliance profile, a physical lot, a controlled sample, and authenticated lab evidence.</p>
        <div className="actions"><Link className="button" href="#passed-lots">Browse passed lots</Link><Link className="textLink" href="/find">Find me a passing lot →</Link></div>
      </section>
      <section className="promise" aria-label="VLE process">
        <div><strong>01</strong><span>Identify</span><p>A specific physical lot, quantity, location, and authority to sell.</p></div>
        <div><strong>02</strong><span>Sample</span><p>A recorded sample and custody workflow tied to that lot.</p></div>
        <div><strong>03</strong><span>Qualify</span><p>Current TECRID-linked evidence evaluated deterministically.</p></div>
        <div><strong>04</strong><span>List</span><p>Only lots passing a frozen profile can become public.</p></div>
      </section>
      <section className="section" id="passed-lots">
        <div className="sectionHeading"><div><p className="eyebrow">Cocoa powder pilot</p><h2>Currently passed lots</h2></div><span className="liveMark">{listings.length} live</span></div>
        {listings.length ? <div className="lotGrid">{listings.map((listing) => (
          <article className="lotCard" key={listing.id}>
            <div className="status"><i /> Passed profile {listing.profileVersion}</div>
            <p className="muted">{listing.product}</p>
            <h3>{listing.lotCode}</h3>
            <dl><div><dt>Available</dt><dd>{listing.quantity} {listing.quantityUnit}</dd></div><div><dt>Location</dt><dd>{listing.location}</dd></div><div><dt>Supplier</dt><dd>{listing.supplier}</dd></div></dl>
            <Link className="cardLink" href={`/lots/${listing.slug}`}>View qualified lot →</Link>
          </article>
        ))}</div> : <div className="emptyState"><h3>No lots are public right now.</h3><p>VLE will not show a lot until every publication gate is satisfied.</p></div>}
      </section>
      <section className="guardrail"><p className="eyebrow">The claim boundary</p><h2>“Passed Compliance Profile X.”</h2><p>VLE does not claim safe, clean, zero, or guaranteed finished-product outcomes. TECRID authenticates evidence; it does not prove sampling, ownership, inventory, or finished-product safety.</p></section>
    </main>
  );
}
