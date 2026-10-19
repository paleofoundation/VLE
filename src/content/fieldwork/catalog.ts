import roster from "./roster.json";
export const categories = ["Olive oil", "Cocoa", "Protein", "Spices", "Tea & matcha", "Rice"] as const;
const categoryNames: Record<string, string> = {"Olive oil":"Olive oil", "Cocoa/cacao":"Cocoa", "Protein/supplement":"Protein", "Spices":"Spices", "Tea/matcha":"Tea & matcha", "Rice":"Rice"};
const names: Record<string, string> = {"From Byadgi (lab reports name From Wonders)":"From Byadgi", "d:matcha Kyoto (D-matcha Co., Ltd.)":"d:matcha Kyoto", "Blueprint (Bryan Johnson)":"Blueprint", "O.E.L. (Stavropoulos Ilias & Co per report)":"O.E.L.", "Olivea (Konstantopoulos S.A. per report)":"Olivea", "Mandya Organic Food Pvt Ltd (Organic Mandya)":"Organic Mandya"};
export function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
export function completeDate(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null; }
export const suppliers = Array.from(new Set(roster.map(r=>r.company))).map(company=>{
 const documents = roster.filter(r=>r.company===company).map((r,i)=>({id: `${slugify(names[company]??company)}-${i+1}`, title:r.doc_tests, product:r.products, url:r.doc_url, lab:r.lab, date:r.report_date, domain:new URL(r.doc_url).hostname, source:r.source_page.startsWith("https://")?r.source_page:r.website}));
 const row=roster.find(r=>r.company===company)!; const name=names[company]??company;
 return {slug:company==="Kasandrinos International"?"kasandrinos":slugify(name),name,legalName:company,country:row.country,category:categoryNames[row.category],website:row.website,documents,products:Array.from(new Set(documents.map(d=>d.product))),latest:documents.map(d=>completeDate(d.date)).filter((d):d is string=>Boolean(d)).sort().at(-1)??null,certifications:row.certifications_shown};
});
export type Supplier = typeof suppliers[number];
export type SourceDocument = Supplier["documents"][number];
export function supplierBySlug(slug:string) { return suppliers.find(s=>s.slug===slug); }
export function documentNotice(d:SourceDocument) { return `Published by the supplier on ${d.domain}, 2026-10-19. Not a VLE-verified result.`; }
export function displayDate(value:string|null) { return value ? new Intl.DateTimeFormat("en-GB", {day:"numeric", month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(value)) : "Date not stated"; }
export const latestDocuments=suppliers.flatMap(s=>s.documents.map(d=>({...d,supplier:s.name,slug:s.slug}))).filter(d=>completeDate(d.date)).sort((a,b)=>b.date.localeCompare(a.date));
