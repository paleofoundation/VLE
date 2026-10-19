import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveCurrentAccess } from "@/lib/current-actor";
import { ensureClaimProfile } from "@/services/listing-claims";
import { verifiedClaimIdentity } from "@/services/listing-claims";
import { websiteEmailMatches } from "@/domain/listing-claims";
import { ClaimForm } from "../form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Claim a supplier profile | VLE", robots: { index: false, follow: false } };
export default async function ClaimProfile({ params }: PageProps<"/claim/[slug]">) {
  const { slug } = await params; 
  const next = `/claim/${slug}`; const access = await resolveCurrentAccess();
  if (access.status === "SIGNED_OUT") redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (access.status === "PENDING_MAPPING") redirect(`/onboarding?as=supplier&next=${encodeURIComponent(next)}`);
  const p = await ensureClaimProfile(slug); if (!p) notFound();
  if (p.claimStatus === "CLAIMED" || p.organizationId) return <main id="main-content" className="fw-container fw-page fw-narrow"><h1>This profile has already been claimed.</h1><Link href={`/suppliers/${slug}`}>Return to the profile</Link></main>;
  const identity = await verifiedClaimIdentity(access.actor);
  return <main id="main-content" className="fw-container fw-page fw-narrow"><p className="fw-eyebrow">Ownership review</p><h1>Claim {p.displayName}</h1>{identity.emailVerified ? <ClaimForm profileId={p.id} domainMatched={websiteEmailMatches(p.website, identity.email)} /> : <p>Verify your primary account email before submitting a claim.</p>}<p>Claims and takedowns: <a href="mailto:marcus@vle.exchange">marcus@vle.exchange</a>. <Link href={`/takedown?profile=${slug}`}>Request a takedown</Link>.</p></main>;
}
