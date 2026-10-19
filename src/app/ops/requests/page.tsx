import { getCurrentPageActor } from "@/lib/page-actor";
import { requireCertificationAdmin } from "@/services/certifications";
import { RequestInbox } from "@/components/requests/inbox";
import styles from "@/components/listing/directory.module.css";
export const dynamic = "force-dynamic";
export default async function OpsRequests() { const actor = await getCurrentPageActor(); requireCertificationAdmin(actor); return <main id="main-content" className={styles.page}><header className={styles.hero}><p className="eyebrow">Operations</p><h1>Brand requests</h1><p>Supplier invitations stay in the VLE queue. No automated message is sent to a non-member supplier.</p></header><RequestInbox actor={actor} view="OPS" /></main>; }
