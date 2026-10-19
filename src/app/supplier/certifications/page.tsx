import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { certificationSuggestions } from "@/db/schema";
import { getCurrentPageActor } from "@/lib/page-actor";
import { ownSupplierProfile, listProfileCertifications } from "@/services/certifications";
import { certificationLabel, certificationExpiry, certificationSuggestionsFor, icsApplyUrl } from "@/domain/certifications";
import { CertificationPicker } from "./picker";
import { removeCertificationAction } from "./actions";
import styles from "@/components/listing/directory.module.css";
export const dynamic = "force-dynamic";
export default async function CertificationsPage() {
  const actor = await getCurrentPageActor(); const profile = await ownSupplierProfile(actor);
  const [rows, manual] = await Promise.all([listProfileCertifications(profile.id), getDb().select().from(certificationSuggestions).where(eq(certificationSuggestions.supplierProfileId, profile.id))]);
  const held = rows.filter((c) => !c.flaggedAt && (!c.expiresOn || c.expiresOn >= new Date().toISOString().slice(0, 10))).map((c) => c.certificationKey);
  const suggested = [...certificationSuggestionsFor(profile.categories, held), ...manual];
  return <main id="main-content" className={styles.page}><header className={styles.hero}><p className="eyebrow">Supplier workspace</p><h1>Certifications</h1><p>Add the certifications you hold. This step is optional. You can return any time.</p><Link className="textLink" href="/supplier">Continue to dashboard →</Link></header>
    <section className={styles.section}><h2>Your certifications</h2>{rows.map((c) => <article className={styles.card} key={c.id}><h3>{c.otherName || c.certificationKey}</h3><p>{certificationLabel(c)} {certificationExpiry(c.expiresOn)}</p>{c.flaggedAt ? <p>Needs review: {c.flagNote}</p> : null}<form action={removeCertificationAction}><input type="hidden" name="id" value={c.id} /><button className="textButton">Remove certification</button></form></article>)}{!rows.length ? <p>No certifications added yet.</p> : null}<CertificationPicker held={rows.map(({ certificationKey, otherName, certifyingBody, certificateNumber, expiresOn, sourceUrl }) => ({ certificationKey, otherName, certifyingBody, certificateNumber, expiresOn, sourceUrl }))} /></section>
    <section className={styles.section}><h2>Certifications buyers ask for in your category</h2><div className={styles.cards}>{suggested.map((s, i) => <article className={styles.card} key={`${s.certificationKey}-${i}`}><h3>{s.certificationKey}</h3><p>{s.note}</p><a className="textLink" href={icsApplyUrl()} rel="noopener noreferrer">Explore certification ↗</a></article>)}</div></section>
    <p>Paleo Foundation operates VLE and issues some of the certifications suggested here.</p>
  </main>;
}
