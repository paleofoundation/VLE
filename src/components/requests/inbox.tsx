import type { Actor } from "@/domain/authz";
import { listSupplierRequests } from "@/services/supplier-requests";
import { REQUEST_LABELS } from "@/domain/supplier-requests";
import { RequestReplyForm } from "./reply-form";
import { closeSupplierRequestAction } from "@/app/requests/actions";
import styles from "@/components/listing/directory.module.css";
export async function RequestInbox({ actor, view }: { actor: Actor; view: "BUYER" | "SUPPLIER" | "OPS" }) {
  const rows = await listSupplierRequests(actor, view);
  return <section className={styles.section} id="requests"><h2>{view === "BUYER" ? "My requests" : view === "SUPPLIER" ? "Incoming requests" : "Requests queue"}</h2>{rows.length ? <div className={styles.cards}>{rows.map(({ request: r, supplier, buyer, replies }) => <article className={styles.card} key={r.id}><span className={styles.chip}>{r.status}</span><h3>{REQUEST_LABELS[r.type]}</h3><p>{supplier.displayName}</p>{view !== "BUYER" ? <p>From: {buyer.displayName}</p> : null}<p style={{ whiteSpace: "pre-wrap" }}>{r.message}</p>{r.quantityText ? <p>Quantity: {r.quantityText}</p> : null}<p>Sent {r.createdAt.toISOString().slice(0,10)}</p>{replies.map((reply) => <blockquote key={reply.id}><p style={{ whiteSpace: "pre-wrap" }}>{reply.message}</p><small>{reply.createdAt.toISOString().slice(0,10)}</small></blockquote>)}{r.status !== "CLOSED" && (view === "SUPPLIER" || view === "OPS" && r.type === "INVITE_SUPPLIER") ? <RequestReplyForm requestId={r.id} /> : null}{view === "BUYER" && r.status !== "CLOSED" ? <form action={closeSupplierRequestAction}><input type="hidden" name="requestId" value={r.id} /><button className="textButton">Close request</button></form> : null}</article>)}</div> : <p>No requests yet.</p>}</section>;
}
