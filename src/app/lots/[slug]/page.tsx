import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicListing } from "@/services/vle";

export const dynamic = "force-dynamic";

export default async function LotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getPublicListing(slug);
  if (!listing) notFound();
  return <main className="narrow">
    <Link className="back" href="/">← Passed lots</Link>
    <section className="detailHero">
      <div className="status"><i /> Publicly eligible</div>
      <p className="eyebrow">{listing.product} · Physical lot</p>
      <h1>{listing.lotCode}</h1>
      <p className="lede">Passed {listing.profileName} v{listing.profileVersion}</p>
    </section>
    <section className="factGrid">
      <div><span>Quantity</span><strong>{listing.quantity} {listing.quantityUnit}</strong></div>
      <div><span>Verified location</span><strong>{listing.location}, {listing.countryCode}</strong></div>
      <div><span>Supplier</span><strong>{listing.supplier}</strong></div>
      <div><span>Decision</span><strong>{listing.decision}</strong></div>
    </section>
    <section className="notice"><strong>What this means</strong><p>This identified physical lot passed the named, frozen compliance profile using current TECRID-linked evidence. Publication is automatically withdrawn if evidence expires or is revoked, or if the lot is held, transformed, or depleted.</p></section>
  </main>;
}
