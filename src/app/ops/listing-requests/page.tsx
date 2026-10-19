import { getDb } from "@/db";
import { getCurrentPageActor } from "@/lib/page-actor";
import { requireCertificationAdmin } from "@/services/certifications";
import { businessDayDeadline } from "@/domain/listing-claims";
import { moderateListingAction } from "@/app/claim/actions";
import { ClaimReviewForm } from "./review-form";
import styles from "@/components/listing/directory.module.css";
export const dynamic = "force-dynamic";
export default async function ListingRequests() {
  requireCertificationAdmin(await getCurrentPageActor());
  const [claims, takedowns, profiles, documents] = await Promise.all([getDb().query.profileClaims.findMany(), getDb().query.takedownRequests.findMany(), getDb().query.supplierProfiles.findMany(), getDb().query.publicDocuments.findMany({ columns: { id: true, supplierProfileId: true, productName: true, docType: true, linkState: true } })]);
  const action = (kind: string, id: string, label: string) => <form action={moderateListingAction}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><button className="textButton">{label}</button></form>;
  return <main id="main-content" className={styles.page}><header className={styles.hero}><p className="eyebrow">Operations</p><h1>Claims and takedowns</h1><p>Takedown requests are honoured within 5 business days. Contact marcus@vle.exchange.</p></header><section className={styles.section}><h2>Ownership claims</h2>{claims.map((c) => <article className={styles.card} key={c.id}><h3>{profiles.find((p) => p.id === c.supplierProfileId)?.displayName}</h3><p>{c.status} · {c.domainMatched ? "Verified primary email domain matched" : "Proof review required"}</p><p>{c.primaryEmail}</p><p>{c.proofNote}</p>{c.status === "PENDING" ? <ClaimReviewForm id={c.id} matched={c.domainMatched} /> : <p>{c.reviewNote}</p>}</article>)}{!claims.length ? <p>No claims queued.</p> : null}</section>
    <section className={styles.section}><h2>Takedown requests</h2>{takedowns.map((t) => <article className={styles.card} key={t.id}><h3>{t.company}</h3><p>{t.name} · {t.email}</p><p>{t.profileUrl}</p><p>{t.whatToRemove}</p><p>{t.reason}</p><p>{t.resolvedAt ? `Resolved ${t.resolvedAt.toISOString().slice(0,10)}` : `Response due by ${businessDayDeadline(t.createdAt).toISOString().slice(0,10)} (weekdays)`}</p>{!t.resolvedAt ? action("takedown", t.id, "Mark resolved") : null}</article>)}{!takedowns.length ? <p>No takedown requests queued.</p> : null}</section>
    <section className={styles.section}><h2>Listing visibility</h2>{profiles.map((p) => <article className={styles.card} key={p.id}><h3>{p.displayName}</h3><p>{p.hidden ? "Hidden" : "Visible"}</p>{!p.hidden ? action("profile", p.id, "Hide profile") : null}{documents.filter((d) => d.supplierProfileId === p.id).map((d) => <div key={d.id}><p>{d.productName} · {d.docType}: {d.linkState}</p>{d.linkState === "LIVE" ? action("document", d.id, "Mark document no longer published") : null}</div>)}</article>)}</section>
  </main>;
}
