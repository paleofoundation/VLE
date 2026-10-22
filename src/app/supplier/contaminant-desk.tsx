import { contaminantDocumentationTypes } from "@/domain/contaminants";
import { ContaminantDocumentForm } from "./contaminant-form";
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
          <h2 id="contaminant-desk-heading">Attach a document to a lot or a profile.</h2>
          <p>Choose one documentation type and one subject. Upload a PDF or record an https reference. Uploaded files are available to your organization and operations. VLE does not extract measured results or change lot status.</p>
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
        <ContaminantDocumentForm lots={desk.lots} profiles={desk.profiles} />

        <div className="artifactLog" aria-live="polite">
          <div className="artifactLogHead"><span>Attached documents</span><strong>{desk.documents.length.toString().padStart(2, "0")}</strong></div>
          {desk.documents.length ? <ol>{desk.documents.map((document) => {
            const type = contaminantDocumentationTypes.find((item) => item.code === document.documentationType);
            const subject = document.lotCode ? `Lot ${document.lotCode}` : document.profileName ? `Profile ${document.profileName}` : "Subject";
            return <li key={document.id}>
              <div><span className="stateChip">{type?.name ?? document.documentationType}</span><time>{formatDate(document.attachedAt)}</time></div>
              <strong>{document.fileName}</strong>
              <p>{subject}. {document.documentDate ? `Document dated ${formatDate(document.documentDate)}. ` : ""}{document.retestOn ? `Retest ${formatDate(document.retestOn)}. ` : "No retest date recorded. "}{document.notes || "No note."}</p>
              {document.hasUpload ? <a className="textLink" href={`/api/contaminant-documents/${document.id}`}>Download uploaded PDF</a> : document.referenceUrl ? <a className="textLink" href={document.referenceUrl} target="_blank" rel="noopener noreferrer nofollow">Open stored reference <span aria-hidden="true">↗</span></a> : null}
              {type ? <a className="textLink" href={type.indexUrl} rel="noopener noreferrer">{type.indexName}</a> : null}
            </li>;
          })}</ol> : <div className="artifactEmpty"><strong>No contaminant document is attached.</strong><p>An empty list is the current record. VLE has not invented a result, a retest date, or a pass.</p></div>}
          {!canAttach ? <p className="warningText">Attachment waits on a physical lot for this organization or a compliance profile. Neither is created here.</p> : null}
        </div>
      </div>
    </section>
  );
}
