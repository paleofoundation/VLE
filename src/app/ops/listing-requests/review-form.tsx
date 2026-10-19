"use client";
import { useActionState } from "react";
import { reviewClaimAction } from "@/app/claim/actions";

export function ClaimReviewForm({ id, matched }: { id: string; matched: boolean }) {
  const [state, action, pending] = useActionState(reviewClaimAction, {});
  return <form action={action} className="fw-form"><input type="hidden" name="claimId" value={id} /><label>Evidence reviewed and decision note<textarea name="reviewNote" required={!matched} minLength={matched ? undefined : 10} maxLength={4000} rows={3} /></label>{state.error ? <p role="alert">{state.error}</p> : null}{state.saved ? <p role="status">Review saved.</p> : null}<button name="action" value="approve" className="fw-button fw-primary" disabled={pending}>Confirm ownership</button><button name="action" value="reject" className="fw-button fw-secondary" disabled={pending}>Reject claim</button></form>;
}
