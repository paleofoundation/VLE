"use client";
import { useActionState } from "react";
import { REQUEST_LABELS, type SupplierRequestType } from "@/domain/supplier-requests";
import { sendSupplierRequestAction } from "../actions";
import styles from "@/app/onboarding/onboarding.module.css";
export function SupplierRequestForm({ supplierProfileId, type, lotId }: { supplierProfileId: string; type: SupplierRequestType; lotId: string | null }) {
  const [state, action, pending] = useActionState(sendSupplierRequestAction, {});
  return <form className={styles.form} action={action}><input type="hidden" name="supplierProfileId" value={supplierProfileId} /><input type="hidden" name="type" value={type} /><input type="hidden" name="lotId" value={lotId ?? ""} />
    <label>Message<textarea name="message" required minLength={5} maxLength={4000} rows={5} /></label><label>Quantity and format (optional)<input name="quantityText" maxLength={300} /></label>
    {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}<button className="button buttonDark" disabled={pending}>{pending ? "Sending…" : REQUEST_LABELS[type]}</button>
  </form>;
}
