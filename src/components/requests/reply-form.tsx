"use client";
import { useActionState } from "react";
import { replySupplierRequestAction } from "@/app/requests/actions";
import styles from "@/app/onboarding/onboarding.module.css";
export function RequestReplyForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(replySupplierRequestAction, {});
  return <form action={action} className={styles.form}><input name="requestId" type="hidden" value={requestId} /><label>Reply<textarea name="message" required minLength={2} maxLength={4000} rows={3} /></label>{state.error ? <p role="alert">{state.error}</p> : null}{state.saved ? <p role="status">Reply saved.</p> : null}<button className="button buttonDark" disabled={pending}>{pending ? "Sending…" : "Send reply"}</button></form>;
}
