import {privateFetch} from './private-fetch.js';
import {kasReports,tecridTestReference} from './kasandrinos.js';
export const KAS_REQUEST_EMAIL='karen@paleofoundation.com';
export function requestNotificationStatement(db,change,revision,at,id){
 return db.prepare(`INSERT INTO kas_access_notifications (id,dedupe_key,kind,report_number,requester_email,request_revision,requested_results,requested_pdf,created_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id,`request:${change.reportNumber}:${change.email}:${revision}`,'access_request',change.reportNumber,change.email,revision,Number(change.requestedResults),Number(change.requestedPdf),at);
}
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function notificationMessage(row){
 const reviewUrl=row.kind==='delivery_test'?'https://tecrid.com/dashboard/kasandrinos':`https://tecrid.com/dashboard/kasandrinos?request=${encodeURIComponent(row.id)}#review-request`;
 let subject,lines;
 if(row.kind==='delivery_test'){
  subject='[TEST] Kasandrinos TECRID access-request email check';
  lines=['TEST notification delivery check','This verifies that Kasandrinos access-request notifications can reach you. No access request was created and no permission was changed.','Open the TEST workspace:',reviewUrl];
 }else{
  const report=kasReports.find(r=>r.reportNumber===row.report_number&&tecridTestReference(r));if(!report)throw Error('Unknown TEST report');
  if(!row.requested_results)throw Error('Legacy file-only request requires a fresh digital-card request');
  const scopes='digital TECRID card';
  subject=`[TEST] Kasandrinos digital TECRID card request · Report ${report.reportNumber}`;
  lines=['Kasandrinos · TEST digital card access request','A verified account requested access. View requester details in the authenticated review workspace.',`Report: ${report.reportNumber} · ${report.title}`,`TEST identifier: ${tecridTestReference(report).testIdentifier}`,`Requested access: ${scopes}`,`Requested at: ${row.created_at}`,'Review this request to approve or decline:',reviewUrl,'Sign in with your authorized Kasandrinos owner or administrator email. Opening this link does not approve access.'];
 }
 lines.push('TEST ONLY · Light Labs approval and signature are pending. The digital card stays locked until an authorized controller approves access. Original PDFs remain private source evidence.');
 const text=lines.join('\n\n');
 const html=`<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#182720"><p style="color:#6b521b;font-weight:bold">TEST · Light Labs approval and signature pending</p><h1 style="font-size:24px">${row.kind==='delivery_test'?'Notification delivery check':'Kasandrinos TECRID access request'}</h1>${lines.filter(line=>line!==reviewUrl).map(line=>`<p>${escapeHtml(line)}</p>`).join('')}<p><a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#213ebf;color:white;padding:14px 20px;text-decoration:none">${row.kind==='delivery_test'?'Open TEST workspace':'Review request · approve or decline'}</a></p></div>`;
 return {to:[KAS_REQUEST_EMAIL],subject,text,html};
}
export async function deliverKasAccessNotifications(db,env,{id=null,limit=3,transport=privateFetch}={}){
 if(!env.RESEND_API_KEY||!env.VLE_EMAIL_FROM)return {configured:false,sent:0};
 const rows=(await db.prepare(`SELECT * FROM kas_access_notifications WHERE status='pending' AND next_attempt<=? ${id?'AND id=?':''} ORDER BY created_at LIMIT ?`).bind(...(id?[Date.now(),id,Math.min(limit,5)]:[Date.now(),Math.min(limit,5)])).all()).results;
 let sent=0;
 for(const row of rows){
  const lease=crypto.randomUUID();const claimed=await db.prepare("UPDATE kas_access_notifications SET lease_id=?,next_attempt=? WHERE id=? AND status='pending' AND next_attempt=?").bind(lease,Date.now()+120000,row.id,row.next_attempt).run();if(!claimed.meta.changes)continue;
  if(row.kind==='access_request'){
   const permission=await db.prepare('SELECT status,revision FROM kas_report_permissions WHERE report_number=? AND recipient_email=?').bind(row.report_number,row.requester_email).first();
   if(!row.requested_results||permission?.status!=='pending'||permission.revision!==row.request_revision){await db.prepare("UPDATE kas_access_notifications SET status='cancelled',lease_id=NULL WHERE id=? AND lease_id=?").bind(row.id,lease).run();continue;}
  }
  let code='transport';
  try{
   const message=notificationMessage(row);
   const r=await transport('https://api.resend.com/emails',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(8000),headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json','idempotency-key':`tecrid-kas-request-${row.id}`},body:JSON.stringify({from:env.VLE_EMAIL_FROM,...message})});
   code=`provider_${r.status}`;if(!r.ok)throw Error('Email not accepted');
   await db.prepare("UPDATE kas_access_notifications SET status='sent',sent_at=?,attempts=attempts+1,last_error=NULL,lease_id=NULL WHERE id=? AND lease_id=?").bind(new Date().toISOString(),row.id,lease).run();sent++;
  }catch{
   await db.prepare("UPDATE kas_access_notifications SET attempts=attempts+1,last_error=?,next_attempt=?,lease_id=NULL WHERE id=? AND lease_id=?").bind(code,Date.now()+Math.min(3600000,60000*2**Math.min(row.attempts,6)),row.id,lease).run();
  }
 }
 return {configured:true,sent};
}
export async function queueNotificationDeliveryTest(db){
 const dedupe=`delivery-test:${new Date().toISOString().slice(0,10)}`;
 await db.prepare("INSERT OR IGNORE INTO kas_access_notifications (id,dedupe_key,kind,requested_results,requested_pdf,created_at) VALUES (?,?,'delivery_test',0,0,?)").bind(crypto.randomUUID(),dedupe,new Date().toISOString()).run();
 return db.prepare('SELECT id,status FROM kas_access_notifications WHERE dedupe_key=?').bind(dedupe).first();
}
