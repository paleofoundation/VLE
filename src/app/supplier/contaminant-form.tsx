"use client";

import { useActionState, useState } from "react";
import { contaminantDocumentationTypes } from "@/domain/contaminants";
import { attachContaminantDocumentAction } from "./contaminant-actions";

type Props = {
  lots: { id: string; supplierLotCode: string; product: string }[];
  profiles: { id: string; name: string; product: string }[];
};

export function ContaminantDocumentForm({ lots, profiles }: Props) {
  const [state, action, pending] = useActionState(attachContaminantDocumentAction, { error: "", success: false });
  const [source, setSource] = useState("UPLOAD");
  const [subject, setSubject] = useState(lots.length ? "LOT" : "PROFILE");
  const canAttach = lots.length > 0 || profiles.length > 0;
  return (
    <form action={action} className="artifactForm">
      <label>Documentation type
        <select name="documentationType" required defaultValue="HEAVY_METALS">
          {contaminantDocumentationTypes.map((type) => <option key={type.code} value={type.code}>{type.name}</option>)}
        </select>
      </label>
      <label>Subject
        <select name="subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
          <option value="LOT" disabled={!lots.length}>Physical lot</option>
          <option value="PROFILE" disabled={!profiles.length}>Compliance profile</option>
        </select>
      </label>
      {subject === "LOT" ? <label>Physical lot
        <select name="physicalLotId" required defaultValue="">
          <option value="" disabled>Choose a lot</option>
          {lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.supplierLotCode} · {lot.product}</option>)}
        </select>
      </label> : <label>Compliance profile
        <select name="complianceProfileId" required defaultValue="">
          <option value="" disabled>Choose a profile</option>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.product}</option>)}
        </select>
      </label>}
      <label>Document source
        <select value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="UPLOAD">Upload a PDF</option>
          <option value="REFERENCE">Record an https reference</option>
        </select>
      </label>
      {source === "UPLOAD" ? <label>PDF file <span>up to 512 KiB</span>
        <input name="file" type="file" accept="application/pdf,.pdf" required />
      </label> : <>
        <label>File name<input name="fileName" required minLength={1} maxLength={180} /></label>
        <label>https reference<input name="referenceUrl" type="url" required maxLength={1000} inputMode="url" /></label>
        <p>Reference links appear on your public supplier profile. Record only a reference you intend to share.</p>
      </>}
      <label>Document date <span>optional</span><input name="documentDate" type="date" /></label>
      <label>Next retest date <span>optional</span><input name="retestOn" type="date" /></label>
      <label>Notes <span>optional</span><textarea name="notes" rows={3} maxLength={1000} placeholder="Document context. No test values." /></label>
      <p>The document name, type and dates appear on your supplier profile. Uploaded PDF contents are available only to your organization and operations.</p>
      <div className="artifactFormFooter">
        <p>Leave the retest date blank when none is scheduled. Attaching a document does not qualify a lot.</p>
        <button className="button" type="submit" disabled={pending || !canAttach}>{pending ? "Attaching..." : "Attach document"}</button>
      </div>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.success ? <p role="status">Document attached. Lot status is unchanged.</p> : null}
    </form>
  );
}
