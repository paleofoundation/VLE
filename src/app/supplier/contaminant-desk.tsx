import { contaminantDocumentationTypes } from "@/domain/contaminants";
import { attachContaminantDocumentAction } from "./contaminant-actions";
import type { listSupplierContaminantDesk } from "@/services/contaminants";

type Desk = Awaited<ReturnType<typeof listSupplierContaminantDesk>>;

function formatDate(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
}

export function SupplierContaminantDesk({ desk }: { desk: Desk }) {
  const canAttach = desk.lots.length > 0 || desk.profiles.length > 0;
  return (
    <section className="contaminantDesk" aria-labelledby="contaminant-desk-heading">
      <div className="artifactPanelHead">
        <div>
          <p className="eyebrow">Contaminant documentation · outside the gate</p>
          <h2 id="contaminant-desk-heading">Attach a file reference to a lot or a profile.</h2>
          <p>Choose one documentation type and one subject. VLE stores the file name and the https reference. It does not store a measured result, and saving a reference does not change lot status.</p>
        </div>
        <div className="artifactBoundary" aria-label="Contaminant document boundary"><span>Document</span><i>≠</i><span>Result</span><i>≠</i><span>QUALIFIED</span></div>
      </div>

      <div className="contaminantGrid contaminantGridCompact">
        {contaminantDocumentationTypes.map((type) => (
          <article key={type.code}>
            <span className="mono">{type.code.replaceAll("_", " ")}</span>
            <h3>{type.name}</h3>
            <p>{type.explainer}</p>
            <a className="textLink" href={type.indexUrl} rel="noopener noreferrer">{type.indexName} <span aria-hidden="true">↗</span></a>
          </article>
        ))}
      </div>

      <div className="artifactLayout">
        <form action={attachContaminantDocumentAction} className="artifactForm">
          <label>Documentation type
            <select name="documentationType" required defaultValue="HEAVY_METALS">
              {contaminantDocumentationTypes.map((type) => <option key={type.code} value={type.code}>{type.name}</option>)}
            </select>
          </label>
          <div className="formRow">
            <label>Subject
              <select name="subject" required defaultValue={desk.lots.length ? "LOT" : "PROFILE"}>
                <option value="LOT" disabled={desk.lots.length === 0}>Physical lot</option>
                <option value="PROFILE" disabled={desk.profiles.length === 0}>Compliance profile</option>
              </select>
            </label>
            <label>Document date <span>optional</span><input name="documentDate" type="date" /></label>
          </div>
          <label>Physical lot <span>required for a lot subject</span>
            <select name="physicalLotId" defaultValue="">
              <option value="">No lot selected</option>
              {desk.lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.supplierLotCode} · {lot.product}</option>)}
            </select>
          </label>
          <label>Compliance profile <span>required for a profile subject</span>
            <select name="complianceProfileId" defaultValue="">
              <option value="">No profile selected</option>
              {desk.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.product}</option>)}
            </select>
          </label>
          <label>File name<input name="fileName" required minLength={1} maxLength={180} placeholder="metals-reference.pdf" /></label>
          <label>https reference<input name="referenceUrl" type="url" required maxLength={1000} inputMode="url" placeholder="https://example.test/reference.pdf" /></label>
          <label>Next retest date <span>optional</span><input name="retestOn" type="date" /></label>
          <label>Notes <span>optional</span><textarea name="notes" rows={3} maxLength={1000} placeholder="Where the file is stored. No test values." /></label>
          <div className="artifactFormFooter">
            <p>Leave the retest date blank when none is scheduled. A blank date is not a pass. This form does not qualify the lot.</p>
            <button className="button" type="submit" disabled={!canAttach}>Attach reference</button>
          </div>
        </form>

        <div className="artifactLog" aria-live="polite">
          <div className="artifactLogHead"><span>Attached references</span><strong>{desk.documents.length.toString().padStart(2, "0")}</strong></div>
          {desk.documents.length ? <ol>{desk.documents.map((document) => {
            const type = contaminantDocumentationTypes.find((item) => item.code === document.documentationType);
            const subject = document.lotCode ? `Lot ${document.lotCode}` : document.profileName ? `Profile ${document.profileName}` : "Subject";
            return <li key={document.id}>
              <div><span className="stateChip">{type?.name ?? document.documentationType}</span><time>{formatDate(document.attachedAt)}</time></div>
              <strong>{document.fileName}</strong>
              <p>{subject}. {document.documentDate ? `Document dated ${formatDate(document.documentDate)}. ` : ""}{document.retestOn ? `Retest ${formatDate(document.retestOn)}. ` : "No retest date recorded. "}{document.notes || "No note."}</p>
              <a className="textLink" href={document.referenceUrl} target="_blank" rel="noopener noreferrer nofollow">Open stored reference <span aria-hidden="true">↗</span></a>
            </li>;
          })}</ol> : <div className="artifactEmpty"><strong>No contaminant document is attached.</strong><p>An empty list is the current record. VLE has not invented a result, a retest date, or a pass.</p></div>}
          {!canAttach ? <p className="warningText">Attachment waits on a physical lot for this organization or a compliance profile. Neither is created here.</p> : null}
        </div>
      </div>
    </section>
  );
}
