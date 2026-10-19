import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveCurrentAccess } from "@/lib/current-actor";
import { getSupplier } from "@/lib/public-listings";
import { verifiedClaimIdentity } from "@/services/listing-claims";
import { websiteEmailMatches } from "@/domain/onboarding";
import { ClaimForm } from "../form";
import styles from "@/app/onboarding/onboarding.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Claim a supplier profile | VLE", robots: { index: false, follow: false } };
export default async function ClaimProfile({ params }: PageProps<"/claim/[slug]">) {
  const { slug } = await params; const p = await getSupplier(slug); if (!p) notFound();
  const next = `/claim/${slug}`; const access = await resolveCurrentAccess();
  if (access.status === "SIGNED_OUT") redirect(`/sign-up?as=supplier&next=${encodeURIComponent(next)}`);
  if (access.status === "PENDING_MAPPING") redirect(`/onboarding?as=supplier&next=${encodeURIComponent(next)}`);
  if (p.claimStatus === "CLAIMED" || p.organizationId) return <main id="main-content" className={styles.page}><h1>This profile has already been claimed.</h1><Link href={`/suppliers/${slug}`}>Return to the profile</Link></main>;
  const identity = await verifiedClaimIdentity(access.actor);
  return <main id="main-content" className={styles.page}><p className="eyebrow">Ownership review</p><h1>Claim {p.displayName}</h1>{identity.emailVerified ? <ClaimForm profileId={p.id} domainMatched={websiteEmailMatches(p.website, identity.email)} /> : <p>Verify your primary account email before submitting a claim.</p>}<p>Claims and takedowns: <a href="mailto:marcus@vle.exchange">marcus@vle.exchange</a>. <Link href={`/takedown?profile=${slug}`}>Request a takedown</Link>.</p></main>;
}
