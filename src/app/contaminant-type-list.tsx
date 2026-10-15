import { contaminantDocumentationTypes } from "@/domain/contaminants";

export function ContaminantTypeList() {
  return (
    <div className="contaminantGrid">
      {contaminantDocumentationTypes.map((type, index) => (
        <article className="contaminantCard" key={type.code} id={type.code.toLowerCase()}>
          <span className="mono">{String(index + 1).padStart(2, "0")} / {type.code.replaceAll("_", " ")}</span>
          <h2>{type.name}</h2>
          <p>{type.explainer}</p>
          <a className="textLink" href={type.indexUrl} rel="noopener noreferrer">
            {type.indexName} <span aria-hidden="true">↗</span>
          </a>
          <small>Institute of Contaminant Standards</small>
        </article>
      ))}
    </div>
  );
}
