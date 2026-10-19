import { listProfileCertifications } from "@/services/certifications";
import { certificationLabel, certificationExpiry } from "@/domain/certifications";
import styles from "./directory.module.css";
export async function PublicCertifications({ profileId, member = false }: { profileId: string; member?: boolean }) {
  const rows = (await listProfileCertifications(profileId)).filter((c) => member || !c.supplierReported);
  return <section className={styles.section}><h2>Supplier certifications</h2>{rows.length ? <div className={styles.cards}>{rows.map((c) => <article className={styles.card} key={c.id}><h3>{c.otherName || c.certificationKey}</h3><p>{c.certifyingBody ?? "Issuing body not stated"}</p>{c.certificateNumber ? <p>Certificate number: {c.certificateNumber}</p> : null}<p>{certificationExpiry(c.expiresOn)}</p><p>{certificationLabel(c)}</p>{c.sourceUrl ? <a className="textLink" href={c.sourceUrl} rel="nofollow noopener noreferrer">Open original certificate ↗</a> : null}</article>)}</div> : <p>No certifications recorded.</p>}</section>;
}
