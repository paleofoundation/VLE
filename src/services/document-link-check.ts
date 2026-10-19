import "server-only";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { eq, or, lt, isNull, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { publicDocuments } from "@/db/schema";
import { isPublicAddress, checkedLinkState } from "@/domain/link-check";
import { ensureRosterModerationRecords } from "./listing-claims";
import { appendAuditEvent } from "./audit";
export async function checkDocumentUrl(value: string, redirects=0, method="HEAD"): Promise<number | null> {
 try {
  const url = new URL(value);
  if (url.protocol!=="https:" || url.username || url.password || (url.port && url.port!=="443") || redirects>4) return null;
  const addresses=await lookup(url.hostname,{all:true});
  if (!addresses.length || addresses.some(a=>!isPublicAddress(a.address))) return null;
  const address=addresses[0];
  // Pin validated DNS, retaining the original hostname for TLS.
  const response=await new Promise<{status:number;location?:string}>((resolve,reject)=>{
   const req=request(url,{method,agent:false,lookup:(_host,_options,callback)=>callback(null,address.address,address.family),headers:{"User-Agent":"VLE-Document-Link-Check/1.0",...(method==="GET"?{Range:"bytes=0-0"}:{})}},res=>{resolve({status:res.statusCode??0,location:res.headers.location});res.destroy();});
   req.setTimeout(8000,()=>req.destroy(new Error("Timeout")));req.on("error",reject);req.end();
  });
  if ([301,302,303,307,308].includes(response.status) && response.location) return checkDocumentUrl(new URL(response.location,url).href,redirects+1,method);
  if ([405,501].includes(response.status) && method==="HEAD") return checkDocumentUrl(value,redirects,"GET");
  return response.status||null;
 } catch { return null; }
}
export async function checkMonthlyDocumentLinks() {
 await ensureRosterModerationRecords();
 const db=getDb(),cutoff=new Date();cutoff.setUTCMonth(cutoff.getUTCMonth()-1);
 const documents=await db.select().from(publicDocuments).where(or(isNull(publicDocuments.lastCheckedAt),lt(publicDocuments.lastCheckedAt,cutoff))).orderBy(asc(publicDocuments.lastCheckedAt));
 let checked=0,removed=0;
 for(let index=0;index<documents.length;index+=5) await Promise.all(documents.slice(index,index+5).map(async d=>{
  const status=await checkDocumentUrl(d.sourceUrl);
  await db.transaction(async tx=>{
   const [current]=await tx.select().from(publicDocuments).where(eq(publicDocuments.id,d.id)).for("update");
   if(!current)return;
   const state=checkedLinkState(current.linkState,status) as typeof current.linkState;
   await tx.update(publicDocuments).set({lastCheckedAt:new Date(),httpStatus:status?String(status):null,linkState:state}).where(eq(publicDocuments.id,d.id));
   if(state!==current.linkState){removed++;await appendAuditEvent(tx,null,{eventType:"DOCUMENT_LINK_NO_LONGER_PUBLISHED",entityType:"public_document",entityId:d.id,data:{status}});}
   checked++;
  });
 }));
 return {checked,removed};
}
