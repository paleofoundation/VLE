import {z} from "zod";
export const sourcingGroups=[
 {id:"rice",label:"Rice",category:"Rice"},
 {id:"cocoa",label:"Cocoa",category:"Cocoa"},
 {id:"protein",label:"Protein",category:"Protein"},
 {id:"spices",label:"Spices",category:"Spices"},
 {id:"tea-and-matcha",label:"Tea and matcha",category:"Tea & matcha"},
 {id:"olive-oil",label:"Olive oil",category:"Olive oil"},
 {id:"baby-food",label:"Baby food",category:"Baby food"},
 {id:"general-qa",label:"General QA",category:null},
] as const;
const source=z.object({number:z.number().int().positive(),title:z.string().trim().min(1),url:z.url().refine(u=>new URL(u).protocol==="https:","Sources must use HTTPS")});
const onVle=z.object({label:z.string().trim().min(1),href:z.string().refine(value=>{
 try{const url=new URL(value,"https://vle.exchange");return value.startsWith("/suppliers?")&&url.origin==="https://vle.exchange"&&url.pathname==="/suppliers"&&Array.from(url.searchParams.keys()).some(k=>["q","category","country","analyte","result","certification","months","status","hasPrice","lab","type"].includes(k)&&Boolean(url.searchParams.get(k)));}catch{return false;}
},"On VLE must link to a filtered supplier search")});
export const sourcingFaqSchema=z.object({groups:z.array(z.object({id:z.enum(sourcingGroups.map(g=>g.id)),questions:z.array(z.object({id:z.string().regex(/^[a-z0-9-]+$/),question:z.string().trim().min(1),answer:z.string().trim().min(1),sources:z.array(source).min(1).refine(s=>new Set(s.map(s=>s.number)).size===s.length,"Source numbers must be unique"),onVle}))}))}).superRefine((data,ctx)=>{
 if(new Set(data.groups.map(g=>g.id)).size!==data.groups.length)ctx.addIssue({code:"custom",message:"Group IDs must be unique"});
 const ids=data.groups.flatMap(g=>g.questions.map(q=>q.id));if(new Set(ids).size!==ids.length)ctx.addIssue({code:"custom",message:"Question IDs must be unique"});
});
export type SourcingFaq=z.infer<typeof sourcingFaqSchema>;
export function faqStructuredData(data:SourcingFaq){return {"@context":"https://schema.org","@type":"FAQPage","@id":"https://vle.exchange/faq#guide",url:"https://vle.exchange/faq",mainEntity:data.groups.flatMap(g=>g.questions.map(q=>({"@type":"Question",name:q.question,acceptedAnswer:{"@type":"Answer",text:`${q.answer}\n\nSources: ${q.sources.map(s=>`[${s.number}] ${s.title}: ${s.url}`).join("; ")}\n\nOn VLE: ${q.onVle.label} https://vle.exchange${q.onVle.href}`}})))};}
export function safeJsonLd(value:unknown){return JSON.stringify(value).replace(/</g,"\\u003c");}
