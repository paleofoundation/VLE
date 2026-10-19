import Link from "next/link";
import { getCurrentPageActor } from "@/lib/page-actor";
import { requireCertificationAdmin } from "@/services/certifications";
import { getDb } from "@/db";
import styles from "@/components/listing/directory.module.css";
export const dynamic = "force-dynamic";
export default async function SupplierSamplingQueue() {
  requireCertificationAdmin(await getCurrentPageActor());
  const [requests, lots, profiles] = await Promise.all([getDb().query.supplierSamplingRequests.findMany(), getDb().query.supplierLots.findMany(), getDb().query.supplierProfiles.findMany()]);
  return <main id="main-content" className={styles.page}><header className={styles.hero}><p className="eyebrow">Operations</p><h1>Supplier TECRID requests</h1><p>Review inventory and arrange independent sampling. A request does not authenticate evidence.</p></header>{requests.map((r) => { const l = lots.find((l) => l.id === r.supplierLotId); return <article className={styles.card} key={r.id}><h2>{profiles.find((p) => p.id === r.supplierProfileId)?.displayName}</h2><p>Lot: {l?.supplierLotCode}</p><p>{r.samplingOrderId ? "Sampling order requested" : "Waiting for supplier inventory details"}</p>{l?.physicalLotId ? <Link className="textLink" href={`/ops/lots/${l.physicalLotId}`}>Open sampling workflow</Link> : <p>Supplier can complete the inventory in its dashboard and request again. Contact: marcus@vle.exchange.</p>}</article>; })}{!requests.length ? <p>No supplier sampling requests yet.</p> : null}</main>;
}
