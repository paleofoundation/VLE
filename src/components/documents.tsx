import { dateLabel, sourceNotice, type Document } from "@/lib/catalog";
import { Arrow, Card, ResultRow, Table } from "./ui";
export function ResultsTable({ document: d }: { document: Document }) {
  return <Card className="results-card"><div className="results-header"><div><p className="eyebrow">Published laboratory results</p><h3>{d.lotCode ? `Lot ${d.lotCode}` : d.product}</h3><p className="small muted">{[d.lab, dateLabel(d.reportDate)].filter(Boolean).join(" · ")}</p></div><a className="text-link" href={d.url} target="_blank" rel="noopener noreferrer">Original report<Arrow external /></a></div><Table caption={`Results for ${d.product}`}><thead><tr><th scope="col">Analyte</th><th scope="col">Result</th><th scope="col">How to read it</th></tr></thead><tbody>{d.results.map(r => <ResultRow key={r.analyte} {...r} />)}</tbody></Table><p className="document-note">{sourceNotice(d)}</p></Card>;
}
export function DocumentList({ documents }: { documents: Document[] }) {
  return <div className="document-list">{documents.map(d => <article key={d.id} className="document-row"><span className="file-mark" aria-hidden="true">PDF</span><div><h3><a href={d.url} target="_blank" rel="noopener noreferrer">{d.title}<Arrow external /></a></h3><p>{d.product} · {dateLabel(d.reportDate)}</p>{d.lab && <p className="small">{d.lab}</p>}<small>{sourceNotice(d)}</small></div></article>)}</div>;
}
