"use client";
import { useActionState } from "react";
import { claimProfileAction } from "./actions";

export function ClaimForm({ profileId, domainMatched }: { profileId: string; domainMatched: boolean }) {
  const [state, action, pending] = useActionState(claimProfileAction, {});
  return <form action={action} className="fw-form"><input name="profileId" type="hidden" value={profileId} /><div style={{ display: "none" }} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p>{domainMatched ? "Your verified primary email domain matches this supplier website. Operations will confirm your claim." : "Your primary email domain does not match this supplier website. Describe your authority to represent the company."}</p><label>Proof note<textarea name="proofNote" required={!domainMatched} minLength={domainMatched ? undefined : 10} maxLength={4000} rows={5} /></label>
    {state.error ? <p role="alert" className="fw-error">{state.error}</p> : null}{state.saved ? <p role="status">Claim queued for operations review. This does not change the listing source or make you a VLE-verified supplier.</p> : <button className="fw-button fw-primary" disabled={pending}>{pending ? "Submitting…" : "Submit claim"}</button>}
  </form>;
}
