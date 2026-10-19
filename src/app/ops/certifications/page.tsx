import { getDb } from "@/db";
import { getCurrentPageActor } from "@/lib/page-actor";
import { requireCertificationAdmin } from "@/services/certifications";
import { CERTIFICATION_KEYS, certificationExpiry, certificationLabel } from "@/domain/certifications";
import { reviewCertificationAction, manualSuggestionAction } from "@/app/supplier/certifications/actions";
import styles from "@/components/listing/directory.module.css";
import formStyles from "@/app/onboarding/onboarding.module.css";
export const dynamic = "force-dynamic";
export default async function CertificationAdminPage() {
  const actor = await getCurrentPageActor(); requireCertificationAdmin(actor);
  const [profiles, rows] = await Promise.all([getDb().query.supplierProfiles.findMany(), getDb().query.supplierCertifications.findMany()]);
  return <main id="main-content" className={styles.page}><header className={styles.hero}><p className="eyebrow">Operations</p><h1>Supplier certifications</h1><p>Confirm only with evidence from the issuing body. A certification does not qualify a VLE lot.</p></header>
    {profiles.map((p) => <section className={styles.section} key={p.id}><h2>{p.displayName}</h2>{rows.filter((c) => c.supplierProfileId === p.id).map((c) => <article className={styles.card} key={c.id}><h3>{c.certificationKey}</h3><p>{certificationLabel(c)} {certificationExpiry(c.expiresOn)}</p>{c.sourceUrl ? <a className="textLink" href={c.sourceUrl} rel="nofollow noopener noreferrer">Read original certificate</a> : null}{c.flaggedAt ? <p>Flagged: {c.flagNote}</p> : null}<form action={reviewCertificationAction} className={formStyles.form}><input type="hidden" name="id" value={c.id} /><label>Issuing body for confirmation, or flag note<input name="note" required maxLength={1000} /></label><div className={styles.actions}><button className="button buttonDark" name="action" value="confirm">Confirm with issuing body</button><button className="textButton" name="action" value="flag">Flag for review</button></div></form></article>)}
      <form action={manualSuggestionAction} className={formStyles.form}><input type="hidden" name="profileId" value={p.id} /><label>Manual suggestion<select name="certificationKey">{CERTIFICATION_KEYS.map((s) => <option key={s}>{s}</option>)}</select></label><label>Note<input name="note" required maxLength={1000} /></label><button className="button buttonDark">Add suggestion</button></form>
    </section>)}
  </main>;
}
