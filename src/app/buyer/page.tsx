import Link from "next/link";
import { getCurrentPageActor } from "@/lib/page-actor";
import { RequestInbox } from "@/components/requests/inbox";
import styles from "@/components/listing/directory.module.css";
export const dynamic = "force-dynamic";
export default async function BuyerDashboard() {
  const actor = await getCurrentPageActor();
  return <main id="main-content" className={styles.page}><header className={styles.hero}><p className="eyebrow">Brand workspace</p><h1>Your sourcing workspace.</h1><p>Browse suppliers and read original documents freely. Track your requests and supplier replies here.</p><div className={styles.actions}><Link className="button buttonDark" href="/suppliers">Find suppliers</Link><Link className="textLink" href="/documents">Read documents</Link><Link className="textLink" href="/buyer/commercial">Commercial desk</Link></div></header>{actor.roles.includes("BUYER") ? <RequestInbox actor={actor} view="BUYER" /> : <p>A brand account is required to manage sourcing requests.</p>}</main>;
}
