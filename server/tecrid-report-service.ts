import {privateFetch} from './private-fetch.js';
import {serviceAuthorized} from './tecrid-service-auth.js';
import {deliverKasAccessNotifications} from './kasandrinos-request-notifications.js';
import {kasReports,tecridTestReference,reportBytes} from './kasandrinos.js';
import {reportPermission,reportPermissionRequest} from './kasandrinos-report-permissions.js';
const headers={'Cache-Control':'private, no-store, max-age=0','Vary':'Authorization','X-Content-Type-Options':'nosniff'};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
export {serviceAuthorized} from './tecrid-service-auth.js';

const key=(r:any)=>`kasandrinos/test-transcripts/${r.sha256}.json`;
export function validateTranscript(input:any,report:any){
 if(!input||input.sourceSha256!==report.sha256||input.reportNumber!==report.reportNumber||!Array.isArray(input.results)||input.results.length<1||input.results.length>40)throw Error('Invalid source binding');
 const results=input.results.map((row:any)=>{
  const result:Record<string,string>={};for(const field of ['analyte','resultText','unit','loqText','limitText','statusText','notes']){
   if(typeof row[field]!=='string'||row[field].length>500)throw Error('Invalid result field');result[field]=row[field];
  }if(!result.analyte||!result.resultText)throw Error('Missing result');return result;
 });
 return {reportNumber:report.reportNumber,sourceSha256:report.sha256,sandbox:true,productionAuthority:false,reviewStatus:'UNAPPROVED_TRANSCRIPTION',results};
}
export async function importTranscripts(request:Request,env:Record<string,any>){
 if(!await serviceAuthorized(request,env))return json({error:'Unauthorized'},401);
 if(!env.BUCKET)return json({error:'Storage unavailable'},503);
 let input;try{const body=await request.text();if(body.length>128000)return json({error:'Too large'},413);input=JSON.parse(body);}catch{return json({error:'Invalid request'},400);}
 const fixed=kasReports.filter((r:any)=>tecridTestReference(r));let documents;
 try{if(!Array.isArray(input.transcripts)||input.transcripts.length!==fixed.length)throw Error();
  documents=fixed.map((r:any)=>{const matches=input.transcripts.filter((t:any)=>t.reportNumber===r.reportNumber);if(matches.length!==1)throw Error();return {report:r,data:validateTranscript(matches[0],r)};});
 }catch{return json({error:'Eight unique source-bound transcripts required'},400);}
 for(const {report,data} of documents){if(!await env.BUCKET.head('kasandrinos/source-reports/'+report.sha256+'.pdf'))return json({error:'Original PDF missing'},409);}
 for(const {report,data} of documents)await env.BUCKET.put(key(report),JSON.stringify(data),{httpMetadata:{contentType:'application/json'},customMetadata:{sha256:report.sha256,reviewStatus:'UNAPPROVED_TRANSCRIPTION'}});
 return json({stored:documents.length,sandbox:true,productionAuthority:false});
}
export async function reportAccess(request:Request,env:Record<string,any>,readPdf=reportBytes){
 if(!await serviceAuthorized(request,env))return json({error:'Unauthorized'},401);
 let input;try{const text=await request.text();if(text.length>4096)return json({error:'Too large'},413);input=JSON.parse(text);}catch{return json({error:'Invalid request'},400);}
 const actor=input?.actor;
 if(!actor||actor.emailVerified!==true||typeof actor.userId!=='string'||!actor.userId.startsWith('email:')||actor.userId.length>160||typeof actor.email!=='string'||actor.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actor.email))return json({error:'Verified email identity required'},403);
 const user={userId:'tecrid:'+actor.userId,email:actor.email.toLowerCase(),displayName:actor.email.toLowerCase()};

 const report=kasReports.find((r:any)=>r.reportNumber===input.reportNumber&&tecridTestReference(r));
 if(!report||!['card','results','pdf'].includes(input.kind))return json({error:'Unknown test report'},404);
 if(!env.BUCKET||!env.DB)return json({error:'Report service unavailable'},503);
 try{
  const permission=await reportPermission(env.DB,user,report.reportNumber);
  if(!(input.kind==='pdf'?permission.canReadPdf:permission.canReadCard))return json({error:'Kasandrinos approval is required for this report and scope.'},403);
  let data:any;
  if(input.kind!=='pdf'){const object=await env.BUCKET.get(key(report));if(!object)return json({error:'Results not yet available'},503);data=validateTranscript(await object.json(),report);}
  const bytes=input.kind==='pdf'?await readPdf(report,env.BUCKET):null;
  await env.DB.prepare('INSERT INTO evidence_views (id,user_id,email,name,company,lot,supplier,viewed_at) VALUES (?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.userId,user.email,user.displayName,user.email.split('@')[1],`${report.lotNumbers.join(', ')} · ${report.reportNumber} · TECRID ${input.kind}`,'kasandrinos',new Date().toISOString()).run();
  if(input.kind!=='pdf')return json(data);
  return new Response(bytes,{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':`inline; filename="Kasandrinos-TEST-${report.reportNumber}.pdf"`,'X-Report-SHA256':report.sha256,'X-TECRID-Sandbox':'true'}});
 }catch{return json({error:'Protected report unavailable'},503);}
}

export async function reportPermissions(request:Request,env:Record<string,any>,notificationTransport:typeof fetch=privateFetch){
 if(!await serviceAuthorized(request,env))return json({error:'Unauthorized'},401);
 if(!env.DB)return json({error:'Permissions unavailable'},503);
 let input;try{const text=await request.text();if(text.length>12000)return json({error:'Too large'},413);input=JSON.parse(text);}catch{return json({error:'Invalid request'},400);}
 const actor=input?.actor;
 if(!actor||actor.emailVerified!==true||typeof actor.userId!=='string'||!actor.userId.startsWith('email:')||actor.userId.length>160||typeof actor.email!=='string'||actor.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actor.email))return json({error:'Verified email identity required'},403);
 const response=await reportPermissionRequest(env.DB,{userId:'tecrid:'+actor.userId,email:actor.email.toLowerCase()},input);
 if(response.ok&&input.action==='request'){
  const data=await response.clone().json() as any;
  if(data.notificationId)await deliverKasAccessNotifications(env.DB,env,{id:data.notificationId,limit:1,transport:notificationTransport}).catch(()=>{});
 }
 return response;
}
