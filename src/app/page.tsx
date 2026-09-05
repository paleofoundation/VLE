import Link from "next/link";
import { formatQuantity } from "@/lib/presentation";
import { listPilotLanes, listPublicListings } from "@/services/vle";

export const dynamic = "force-dynamic";

const gateSteps = [
  ["01", "Lot identity", "A named physical lot—not a generic product."],
  ["02", "Inventory authority", "Quantity, location, and authority to sell verified."],
  ["03", "Controlled sample", "A sampling and custody record bound to the lot."],
  ["04", "TECRID + decision", "Current authenticated evidence and a deterministic QUALIFIED decision."],
] as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

type PilotLane = Awaited<ReturnType<typeof listPilotLanes>>[number];
type PublicListing = Awaited<ReturnType<typeof listPublicListings>>[number];

function LaneShelf({ lane, listings }: { lane: PilotLane; listings: PublicListing[] }) {
  const isCocoa = lane.productCode === "COCOA_POWDER";
  return (
    <section className="laneShelf" aria-labelledby={`lane-${lane.productCode}`}>
      <div className="laneHeader">
        <div><span className="mono">{lane.productCode.replaceAll("_", " / ")}</span><h3 id={`lane-${lane.productCode}`}>{lane.product}</h3><p>{lane.profileName} v{lane.profileVersion} · frozen profile</p></div>
        <span className="liveMark"><i /> {listings.length} public</span>
      </div>
      {listings.length ? (
        <div className="lotGrid">
          {listings.map((listing) => (
            <article className="lotCard" key={listing.id}>
              <div className="lotCardHeader">
                <span className="status statusPassed"><i /> Passed {listing.profileName} v{listing.profileVersion}</span>
                <span className="mono lotRef">LOT</span>
              </div>
              <p className="productLabel">{listing.product}</p>
              <h3>{listing.lotCode}</h3>
              <p className="supplierLine">Supplied by <strong>{listing.supplier}</strong></p>
              <dl className="lotFacts">
                <div><dt>Available quantity</dt><dd>{formatQuantity(listing.quantity)} {listing.quantityUnit}</dd></div>
                <div><dt>Verified location</dt><dd>{listing.location}, {listing.countryCode}</dd></div>
                <div><dt>Evidence status</dt><dd className="currentText">Current · to {formatDate(listing.evidenceExpiresAt)}</dd></div>
              </dl>
              <Link className="cardLink" href={`/lots/${listing.slug}`}><span>Inspect qualification basis</span><span aria-hidden="true">↗</span></Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="readinessEmpty laneEmpty">
          <div className="emptyCopy">
            <span className="emptyIndex mono">LANE / READY</span>
            <h3>{lane.product} lane open.</h3>
            <p>Lots appear here only after they pass {lane.profileName} v{lane.profileVersion}. An empty lane means the gate is working—not that qualification has been skipped.</p>
            {isCocoa ? <Link className="textLink" href="/find">Need a passing cocoa lot? Record the requirement</Link> : <p className="laneBoundary">Avocado fruit matching is not enabled; this is qualification and publication readiness only.</p>}
          </div>
          <ol className="gateChecklist" aria-label={`Requirements before a ${lane.product} lot can list`}>
            {gateSteps.map(([number, title, description]) => <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{description}</p></div></li>)}
          </ol>
        </div>
      )}
    </section>
  );
}

export default async function HomePage() {
  const [listings, pilotLanes] = await Promise.all([listPublicListings(), listPilotLanes()]);
  const lanes = pilotLanes.toSorted((a, b) => Number(b.productCode === "COCOA_POWDER") - Number(a.productCode === "COCOA_POWDER"));

  return (
    <main id="main-content">
      <section className="hero heroHome">
        <div className="heroCopy">
          <p className="eyebrow eyebrowLight">Verified Lot Exchange · Two pilot lanes</p>
          <h1>Buy the lot that already passed.</h1>
          <p className="heroLead">VLE turns a compliance requirement into a sourcing condition—before the ingredient lot is bought.</p>
          <div className="actions">
            <Link className="button" href="#passed-lots">View passed lots</Link>
            <Link className="textLink textLinkLight" href="/find">Record a buyer requirement</Link>
            <Link className="textLink textLinkLight" href="/for-suppliers">See the supplier path</Link>
          </div>
        </div>
        <aside className="pilotCard" aria-label="Cocoa powder and avocado fruit pilot status">
          <div className="pilotCardTop">
            <span className="signal"><i /> Pilot lane open</span>
            <span className="mono">PILOT / 02</span>
          </div>
          <div className="pilotProduct">
            <span>Ingredient</span>
            <strong>Cocoa powder + avocado fruit</strong>
          </div>
          <dl>
            <div><dt>Public shelf</dt><dd>{listings.length ? `${listings.length} passed ${listings.length === 1 ? "lot" : "lots"}` : "Awaiting passed lots"}</dd></div>
            <div><dt>Lane profiles</dt><dd>{lanes.length} frozen</dd></div>
            <div><dt>Evidence</dt><dd>TECRID-linked</dd></div>
          </dl>
          <p>Expanding by proof, not by catalog.</p>
        </aside>
      </section>

      <section className="networkBand" aria-labelledby="network-heading">
        <div className="networkIntro">
          <p className="eyebrow" id="network-heading">One evidence network. Separate responsibilities.</p>
          <p>VLE is the sourcing layer. It does not replace scientific knowledge, authenticated evidence, or finished-product certification.</p>
        </div>
        <ol className="networkRail">
          <li><span>01</span><strong>HMI</strong><small>Know</small></li>
          <li><span>02</span><strong>TECRID</strong><small>Prove evidence</small></li>
          <li className="active"><span>03</span><strong>VLE</strong><small>Source passed lots</small></li>
          <li><span>04</span><strong>HMTc</strong><small>Certify finished product</small></li>
        </ol>
      </section>

      <section className="shelfSection" id="passed-lots">
        <div className="sectionHeading shelfHeading">
          <div>
            <p className="eyebrow">Public eligibility shelf</p>
            <h2>Passed lots, separated by pilot lane</h2>
            <p className="sectionLead">Every lot shown has cleared the same publication gate against its lane-specific frozen profile. If eligibility changes, the listing is withdrawn.</p>
          </div>
          <span className="liveMark"><i /> {listings.length} public</span>
        </div>

        <div className="pilotLanes">{lanes.map((lane) => <LaneShelf key={lane.productTypeId} lane={lane} listings={listings.filter(({ productCode }) => productCode === lane.productCode)} />)}</div>
      </section>

      <section className="truthSection" aria-labelledby="truth-heading">
        <div className="truthStatement">
          <p className="eyebrow">What VLE can say</p>
          <h2 id="truth-heading">“Passed Compliance Profile X.”</h2>
        </div>
        <div className="truthDetail">
          <p>That claim belongs to one identified physical lot, one frozen profile version, and current TECRID-linked evidence.</p>
          <p>TECRID authenticates evidence. VLE separately records lot identity, inventory facts, sampling, qualification, and listing eligibility. HMTc—not VLE—certifies finished products.</p>
        </div>
      </section>
    </main>
  );
}
