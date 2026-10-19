"use client";
import { useActionState, type ReactNode } from "react";
import { supplierWriteAction } from "./self-listing-actions";
import styles from "@/app/onboarding/onboarding.module.css";
export function SupplierWriteForm({ operation, children, button = "Save" }: { operation: string; children: ReactNode; button?: string }) {
  const [state, action, pending] = useActionState(supplierWriteAction, {});
  return <form action={action} className={styles.form}><input type="hidden" name="operation" value={operation} />{children}{state.error ? <p role="alert" className={styles.error}>{state.error}</p> : null}{state.saved ? <p role="status">Saved.</p> : null}<button className="button buttonDark" disabled={pending}>{pending ? "Saving…" : button}</button></form>;
}
