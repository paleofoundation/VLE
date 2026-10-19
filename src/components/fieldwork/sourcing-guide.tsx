import Link from "next/link";
import {sourcingGroups,type SourcingFaq} from "@/domain/sourcing-faq";
import {Arrow,EmptyState} from "./ui";
export function SourcingGuide({data,unavailable=false}:{data:SourcingFaq;unavailable?:boolean}){
 const count=data.groups.reduce((total,g)=>total+g.questions.length,0);
 return <><nav className="fw-guide-nav" aria-label="Sourcing guide ingredients">{sourcingGroups.map(g=><a href={`#${g.id}`} key={g.id}>{g.label}</a>)}</nav>{!count?<EmptyState title={unavailable?"The sourcing guide is being reviewed.":"Sourcing answers are on their way."}><p>Ingredient guidance will appear here with numbered sources and a direct supplier search. Browse the original documents while the guide is prepared.</p><Link href="/documents" className="fw-text-link">Browse public documents <Arrow/></Link></EmptyState>:null}<div className="fw-guide-sections">{sourcingGroups.map(g=>{
 const questions=data.groups.find(group=>group.id===g.id)?.questions??[];
 return <section id={g.id} key={g.id} className="fw-guide-section"><header><p className="fw-eyebrow">SOURCING GUIDE</p><h2>{g.label}</h2></header><div>{questions.length?questions.map(q=><details className="fw-faq" id={q.id} key={q.id}><summary>{q.question}</summary><div className="fw-guide-answer">{q.answer.split(/\n\s*\n/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}<div className="fw-guide-sources"><h3>Sources</h3><ol>{q.sources.map(s=><li key={s.number} value={s.number}><a href={s.url} rel="noopener noreferrer">{s.title} <Arrow diagonal/></a></li>)}</ol></div><p className="fw-guide-onvle"><strong>On VLE</strong><Link className="fw-text-link" href={q.onVle.href}>{q.onVle.label} <Arrow/></Link></p></div></details>):<p className="fw-muted">No sourced answers published yet.</p>}</div></section>;
 })}</div></>;
}
