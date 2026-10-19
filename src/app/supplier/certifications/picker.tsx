"use client";
import { useActionState, useState } from "react";
import { CERTIFICATION_GROUPS } from "@/domain/certifications";
import { saveCertificationAction } from "./actions";
import styles from "@/app/onboarding/onboarding.module.css";
type Held = { certificationKey: string; otherName: string | null; certifyingBody: string | null; certificateNumber: string | null; expiresOn: string | null; sourceUrl: string | null };
function CertificateEntry({ name, held }: { name: string; held?: Held }) {
  const [state, action, pending] = useActionState(saveCertificationAction, {});
  return <form action={action} className={styles.form}>
    <input type="hidden" name="certificationKey" value={name} /><h3>{name}</h3>
    <label>Other certification name<input name="otherName" maxLength={300} required={name === "Other"} defaultValue={held?.otherName ?? ""} /></label>
    <label>Certifying body<input name="certifyingBody" maxLength={300} defaultValue={held?.certifyingBody ?? ""} /></label><label>Certificate number<input name="certificateNumber" maxLength={300} defaultValue={held?.certificateNumber ?? ""} /></label>
    <label>Expiry date<input type="date" name="expiresOn" defaultValue={held?.expiresOn ?? ""} /></label><label>Original certificate PDF or page URL<input name="sourceUrl" type="url" maxLength={2000} placeholder="https://" defaultValue={held?.sourceUrl ?? ""} /></label>
    <p>Leave unknown details blank. Saving changes replaces any earlier issuing-body confirmation.</p>
    {state.error ? <p role="alert" className={styles.error}>{state.error}</p> : null}{state.saved ? <p role="status">Certification saved.</p> : null}
    <button className="button buttonDark" disabled={pending}>{pending ? "Saving…" : `Save ${name}`}</button>
  </form>;
}
export function CertificationPicker({ held = [] }: { held?: Held[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  return <div className={styles.form}><h3>Choose the certifications you hold</h3>
    {CERTIFICATION_GROUPS.map((g) => <fieldset key={g.name} className={styles.categories}><legend>{g.name}</legend>{g.items.map((name) => <div key={name}><label><input type="checkbox" checked={selected.includes(name)} onChange={(e) => setSelected((old) => e.target.checked ? [...old, name] : old.filter((s) => s !== name))} />{name}</label>{selected.includes(name) ? <CertificateEntry name={name} held={held.find((c) => c.certificationKey === name)} /> : null}</div>)}</fieldset>)}
  </div>;
}
