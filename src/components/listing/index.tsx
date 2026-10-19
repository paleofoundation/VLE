import Link from "next/link";
import { documentSourceText, evidenceIsCurrent, LOT_STEPS, type LotProgress, type VerifiedEvidence } from "@/domain/public-listings";
import styles from "./listing.module.css";

export function NonMemberBanner({ slug }: { slug: string }) {
  return <aside className={styles.banner}>Listed from public documents. Not a VLE member. Is this your company? <Link href={`/claim/${slug}`}>Claim this profile</Link>.</aside>;
}
export function DocumentSourceLabel({ domain, date, sourcePageUrl }: { domain: string; date: string; sourcePageUrl?: string | null }) {
  return <small className={styles.source}>{documentSourceText(domain, date, sourcePageUrl)}</small>;
}
export function VerifiedBadge({ evidence }: { evidence: VerifiedEvidence | null }) {
  return evidenceIsCurrent(evidence) ? <span className={styles.verified}>{evidence!.kind} verified</span> : null;
}
export function LotStatusSteps({ records = {} }: { records?: LotProgress }) {
  return <ol className={styles.steps}>{LOT_STEPS.map((step) => <li key={step}><strong>{step}</strong><span>{records[step] ? "Recorded" : "Pending"}</span></li>)}</ol>;
}
