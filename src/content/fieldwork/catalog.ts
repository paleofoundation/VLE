import {kasandrinosProducts,kasandrinosReports,kasandrinosCertifications} from "../suppliers/kasandrinos";
import roster from "./roster.json";
export const categories = ["Olive oil", "Cocoa", "Protein", "Spices", "Tea & matcha", "Rice"] as const;
const categoryNames: Record<string, string> = {"Olive oil":"Olive oil", "Cocoa/cacao":"Cocoa", "Protein/supplement":"Protein", "Spices":"Spices", "Tea/matcha":"Tea & matcha", "Rice":"Rice"};
const names: Record<string, string> = {"From Byadgi (lab reports name From Wonders)":"From Byadgi", "d:matcha Kyoto (D-matcha Co., Ltd.)":"d:matcha Kyoto", "Blueprint (Bryan Johnson)":"Blueprint", "O.E.L. (Stavropoulos Ilias & Co per report)":"O.E.L.", "Olivea (Konstantopoulos S.A. per report)":"Olivea", "Mandya Organic Food Pvt Ltd (Organic Mandya)":"Organic Mandya"};
export function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
export function completeDate(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null; }
export const suppliers = Array.from(new Set(roster.map(r=>r.company))).map(company=>{
 const documents = roster.filter(r=>r.company===company).map((r,i)=>({id: `${slugify(names[company]??company)}-${i+1}`, title:r.doc_tests, product:r.products, url:r.doc_url, lab:r.lab, date:r.report_date, domain:new URL(r.doc_url).hostname, source:r.source_page.startsWith("https://")?r.source_page:r.website}));
 const row=roster.find(r=>r.company===company)!; const name=names[company]??company;
 return {member:false as boolean,slug:company==="Kasandrinos International"?"kasandrinos":slugify(name),name,legalName:company,country:row.country,category:categoryNames[row.category],website:row.website,documents,products:Array.from(new Set(documents.map(d=>d.product))),latest:documents.map(d=>completeDate(d.date)).filter((d):d is string=>Boolean(d)).sort().at(-1)??null,certifications:row.certifications_shown};
});
export type SourceDocument={id:string;title:string;product:string;url:string;lab:string;date:string;domain:string;source:string;supplierReported?:boolean;foundAt?:string;linkState?:string;lastChecked?:string|null};
export type Supplier=Omit<typeof suppliers[number],"documents">&{documents:SourceDocument[];productSpecs?:{id:string;name:string;slug:string;ingredient:string;form:string;origin:string;source:string}[];certificateSpecs?:{name:string;note:string;url:string;date:string}[];memberLots?:{id:string;code:string;product:string;records:Record<string,string|null>}[]};
export function supplierBySlug(slug:string) { return suppliers.find(s=>s.slug===slug); }
export function documentNotice(d:SourceDocument) {if(d.supplierReported)return "Supplier-reported. Not a VLE-verified result.";if(d.domain==="cdn.labdoor.io")return `Published by the supplier on cdn.labdoor.io (linked from transparentlabs.com), ${d.foundAt??"2026-10-19"}. Not a VLE-verified result.`;return `Published by the supplier on ${d.domain}, ${d.foundAt??"2026-10-19"}. Not a VLE-verified result.`; }
export function displayDate(value:string|null) { return value ? new Intl.DateTimeFormat("en-GB", {day:"numeric", month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(value)) : "Date not stated"; }
export const latestDocuments=suppliers.flatMap(s=>s.documents.map(d=>({...d,supplier:s.name,slug:s.slug}))).filter(d=>completeDate(d.date)).sort((a,b)=>b.date.localeCompare(a.date));

export function profileDocuments(s:Supplier) {return s.slug==="kasandrinos" ? kasandrinosReports.map((d,i)=>({id:`kasandrinos-report-${i}`,title:d.category,product:d.subject,url:d.url,lab:s.documents.find(x=>x.url===d.url)?.lab??"",date:d.date,domain:"kasandrinos.com",source:s.website})) : s.documents;}
export function profileProducts(s:Supplier) {if(s.productSpecs)return s.productSpecs;return s.slug==="kasandrinos"?kasandrinosProducts.map(p=>({name:p.name,slug:slugify(p.name),ingredient:"Organic extra virgin olive oil",form:p.format,origin:"",source:p.url})):s.products.map(name=>({name,slug:slugify(name),ingredient:s.category,form:"",origin:"",source:s.website}));}
export function profileCertificates(s:Supplier){if(s.certificateSpecs)return s.certificateSpecs;return s.slug==="kasandrinos"?kasandrinosCertifications.map(c=>({name:c.name,note:"statusNote" in c?c.statusNote:"Supplier-reported",url:c.url,date:c.date})):s.certifications?[{name:s.certifications,note:"Supplier-reported",url:s.website,date:""}]:[];}
export function reportedLot(d:SourceDocument){return d.product.match(/\b(?:lot|batch)\s+([^,)]+)/i)?.[1]??null;}
export const reportedLots=suppliers.flatMap(s=>s.documents.filter(d=>reportedLot(d)).map(d=>({id:d.id,code:reportedLot(d)!,supplier:s,document:d}))).filter((x,i,a)=>a.findIndex(y=>y.supplier.slug===x.supplier.slug&&y.code===x.code)===i);
export type ReportedResult={analyte:string;value:string;unit:string;note?:string};
// Only explicit measurements supplied in the approved roster. No thresholds inferred from prose.
export function rosterResults(d:SourceDocument):ReportedResult[]{
 if(d.url.includes("11069"))return [{analyte:"Lead",value:"0.26",unit:"mg/kg"},{analyte:"Cadmium",value:"0.28",unit:"mg/kg"}];
 if(d.url.includes("CoA_25-510880"))return [{analyte:"Cadmium",value:"0.814",unit:"ppm"},{analyte:"Lead",value:"0.068",unit:"ppm"}];
 if(d.url.includes("08000465"))return [{analyte:"Lead",value:"0.089",unit:"mg/kg"}];
 return [];
}
