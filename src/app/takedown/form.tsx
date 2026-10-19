"use client";
import { useActionState } from "react";
import { takedownAction } from "./actions";
import styles from "@/app/onboarding/onboarding.module.css";
export function TakedownForm({ profileUrl }: { profileUrl: string }) {
  const [state, action, pending] = useActionState(takedownAction, {});
  return <form action={action} className={styles.form}><label>Company<input name="company" required minLength={2} maxLength={200} /></label><label>Your name<input name="name" required minLength={2} maxLength={160} autoComplete="name" /></label><label>Email<input name="email" type="email" required maxLength={320} autoComplete="email" /></label><label>Supplier profile URL<input name="profileUrl" type="url" required defaultValue={profileUrl} maxLength={2000} /></label><label>What should be removed?<textarea name="whatToRemove" required minLength={3} maxLength={2000} rows={3} /></label><label>Reason<textarea name="reason" required minLength={5} maxLength={4000} rows={4} /></label><div style={{ display: "none" }} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>{state.error ? <p role="alert" className={styles.error}>{state.error}</p> : null}{state.saved ? <p role="status">Your takedown request is recorded. Takedown requests are honoured within 5 business days.</p> : <button className="button buttonDark" disabled={pending}>{pending ? "Submitting…" : "Submit takedown request"}</button>}</form>;
}
