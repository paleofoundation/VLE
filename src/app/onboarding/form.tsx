"use client";
import { useActionState, useState } from "react";
import { CATEGORIES } from "@/domain/public-listings";
import { onboardAction } from "./actions";
import styles from "./onboarding.module.css";
export function OnboardingForm({ initialRole, next }: { initialRole: "SUPPLIER" | "BUYER"; next: string | null }) {
  const [role, setRole] = useState(initialRole); const [state, action, pending] = useActionState(onboardAction, {});
  return <form action={action} className={styles.form}>
    {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}
    <input type="hidden" name="next" value={next ?? ""} />
    <fieldset className={styles.roles}><legend>How will you use VLE?</legend>
      <label><input type="radio" name="role" value="SUPPLIER" checked={role === "SUPPLIER"} onChange={() => setRole("SUPPLIER")} />I am an ingredient supplier</label>
      <label><input type="radio" name="role" value="BUYER" checked={role === "BUYER"} onChange={() => setRole("BUYER")} />I am a brand sourcing ingredients</label>
    </fieldset>
    <label>Company name<input name="companyName" required minLength={2} maxLength={160} autoComplete="organization" /></label>
    <label>Company website<input name="website" type="url" placeholder="https://" required maxLength={500} autoComplete="url" /></label>
    <label>Country<input name="country" required minLength={2} maxLength={120} autoComplete="country-name" /></label>
    <label>Your role in the company<input name="companyRole" required minLength={2} maxLength={120} autoComplete="organization-title" /></label>
    {role === "SUPPLIER" ? <fieldset className={styles.categories}><legend>Ingredient categories</legend>{CATEGORIES.map((c) => <label key={c}><input type="checkbox" name="categories" value={c} />{c}</label>)}</fieldset> : null}
    <button className="button buttonDark" type="submit" disabled={pending}>{pending ? "Creating your account…" : "Create organization"}</button>
  </form>;
}
