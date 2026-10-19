import {documentNotice,type SourceDocument} from "@/content/fieldwork/catalog";
import {Arrow} from "./ui";
export function ProofStrip({documents}:{documents:SourceDocument[]}){
 const document=documents.find(d=>d.linkState!=="NO_LONGER_PUBLISHED");
 return <aside className="fw-proof-strip" aria-label="Original evidence">{document?<><div><strong>{document.title}</strong><small>{document.date||"Report date not stated"}{document.lab?` · ${document.lab}`:""}</small></div><a data-document href={document.url} rel="noopener noreferrer">Open original report <Arrow diagonal/></a><p>{documentNotice(document)}</p></>:<><strong>No original report available.</strong><p>Missing evidence stays visible. No test result has been inferred.</p></>}</aside>;
}
