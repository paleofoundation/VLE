import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { formatQuantity } from "@/lib/presentation";
import { getPublicListing } from "@/services/vle";

export const dynamic = "force-dynamic";
const getListing = cache(getPublicListing);

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "long", year: "numeric" }).format(value);
}

export async function generateMetadata({ params }: PageProps<"/lots/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  return listing
    ? { title: `${listing.lotCode} — Passed ${listing.profileName} v${listing.profileVersion} | VLE` }
    : { title: "Lot unavailable | VLE" };
}

export default async function LotPage({ params }: PageProps<"/lots/[slug]">) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) notFound();

  return (
    <main id="main-content" className="lotDetailPage">
      <div className="detailBreadcrumb">
        <Link className="back" href="/">Passed lots</Link>
        <span aria-hidden="true">/</span>
        <span>{listing.lotCode}</span>
      </div>

      <section className="detailHero">
        <div className="detailHeroCopy">
          <span className="status statusPassed"><i /> Public eligibility current</span>
          <p className="eyebrow">{listing.product} · Identified physical lot</p>
          <h1>{listing.lotCode}</h1>
          <p className="detailClaim">Passed {listing.profileName} v{listing.profileVersion}</p>
          <p className="detailLead">This listing refers to this lot only. Its qualification does not transfer to another lot, a transformed ingredient, or a finished product.</p>
        </div>
        <aside className="eligibilityCard" aria-label="Listing eligibility summary">
          <div className="eligibilityHeading">
            <span>Listing basis</span>
            <strong>Gate clear</strong>
          </div>
          <dl>
            <div><dt>Decision</dt><dd>{listing.decision}</dd></div>
            <div><dt>Profile</dt><dd>{listing.profileName} v{listing.profileVersion}</dd></div>
            <div><dt>Evidence</dt><dd>{listing.evidenceStatus} through {formatDate(listing.evidenceExpiresAt)}</dd></div>
            <div><dt>Published</dt><dd>{formatDate(listing.publishedAt)}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="detailFacts" aria-labelledby="lot-facts-heading">
        <div className="detailSectionHeading">
          <p className="eyebrow">Physical inventory</p>
          <h2 id="lot-facts-heading">The lot being offered</h2>
        </div>
        <dl className="factGrid">
          <div><dt>Available quantity</dt><dd>{formatQuantity(listing.quantity)} {listing.quantityUnit}</dd></div>
          <div><dt>Verified location</dt><dd>{listing.location}, {listing.countryCode}</dd></div>
          <div><dt>Supplier organization</dt><dd>{listing.supplier}</dd></div>
          <div><dt>Lot identity</dt><dd>{listing.lotCode}</dd></div>
        </dl>
      </section>

      <section className="qualificationBasis" aria-labelledby="basis-heading">
        <div className="detailSectionHeading">
          <p className="eyebrow">Qualification basis</p>
          <h2 id="basis-heading">Why this lot can appear here</h2>
          <p>VLE exposes the eligibility chain, not a supplier-uploaded PDF presented as proof.</p>
        </div>
        <ol className="basisGrid">
          <li><span>01</span><strong>Identity + inventory</strong><p>The physical lot, quantity, location, and authority to sell were recorded and verified.</p></li>
          <li><span>02</span><strong>Sample linkage</strong><p>A controlled sample and custody record bind the tested material to this physical lot.</p></li>
          <li><span>03</span><strong>TECRID evidence</strong><p>Authenticated evidence is current and bound to the sample. Verified {formatDate(listing.evidenceVerifiedAt)}.</p></li>
          <li><span>04</span><strong>Frozen decision rule</strong><p>A deterministic decision qualified the evidence against {listing.profileName} v{listing.profileVersion}.</p></li>
        </ol>
      </section>

      <section className="lotBoundary">
        <div><p className="eyebrow">Claim boundary</p><h2>Passed profile. Specific lot.</h2></div>
        <p>Publication is withdrawn if evidence expires or is revoked, or if the lot is held, transformed, or depleted. TECRID authenticates evidence; it does not prove sampling, ownership, inventory, or finished-product outcomes.</p>
      </section>
    </main>
  );
}
