import {signedServiceInit} from '../server/service-assertion.js';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {reportPermissionRequest,reportPermission} from '../server/kasandrinos-report-permissions.js';
import {deliverKasAccessNotifications,notificationMessage,KAS_REQUEST_EMAIL} from '../server/kasandrinos-request-notifications.js';
import {reportPermissions} from '../server/tecrid-report-service.ts';
import {notificationService} from '../server/kasandrinos-notification-service.ts';
import {ensureKasTeam} from '../server/teams.js';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-22'});
try{
 const db=await mf.getD1Database('DB');for(const f of readdirSync(new URL('../drizzle',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())for(const sql of readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();await ensureKasTeam(db);
 const setup=await db.prepare("SELECT * FROM kas_access_notifications WHERE dedupe_key='installation-check:kas-access-notifications-v1'").first();assert.equal(setup.kind,'delivery_test');assert.equal((await db.prepare('SELECT count(*) AS count FROM kas_report_permissions').first()).count,0);assert.equal((await db.prepare('SELECT count(*) AS count FROM kas_report_permission_events').first()).count,0);
 await db.prepare("DELETE FROM kas_access_notifications WHERE kind='delivery_test'").run();
 const env={DB:db,RESEND_API_KEY:'synthetic-key',VLE_EMAIL_FROM:'Synthetic sender <sender@company.test>',TECRID_EMAIL_RELAY_SECRET:'synthetic-service',TECRID_NOTIFICATION_SERVICE_SECRET:'synthetic-notification-'.repeat(4),TECRID_REPORT_PERMISSION_SECRET:'synthetic-permission-'.repeat(4)};
 const buyer={userId:'email:buyer',email:'recipient@company.test'},owner={userId:'email:owner',email:KAS_REQUEST_EMAIL};
 const call=async(user,input,status=200)=>{const r=await reportPermissionRequest(db,user,input);const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));return j;};
 await call(buyer,{action:'request',reportNumber:'unknown',results:true},404);assert.equal((await db.prepare('SELECT count(*) AS count FROM kas_access_notifications').first()).count,0);
 const notice=await call(buyer,{action:'request',reportNumber:'43301',card:true,to:'intruder@evil.test',notificationEmail:'intruder@evil.test'});assert(notice.notificationId);
 await call(buyer,{action:'request',reportNumber:'43301',card:true});assert.equal((await db.prepare('SELECT count(*) AS count FROM kas_access_notifications').first()).count,1);assert.equal((await reportPermission(db,buyer,'43301')).canReadResults,false);
 const calls=[];const transport=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');assert.equal(options.redirect,'manual');calls.push({body:JSON.parse(options.body),key:options.headers['idempotency-key']});return Response.json({id:'synthetic-mail'});};
 await Promise.all([deliverKasAccessNotifications(db,env,{transport}),deliverKasAccessNotifications(db,env,{transport})]);assert.equal(calls.length,1);
 assert.deepEqual(calls[0].body.to,[KAS_REQUEST_EMAIL]);assert.match(calls[0].body.subject,/\[TEST\]/);assert.match(calls[0].body.text,/recipient@company.test/);assert.match(calls[0].body.text,/Requested access: digital TECRID card/);assert.match(calls[0].body.text,new RegExp('request='+notice.notificationId));assert.match(calls[0].body.text,/Opening this link does not approve access/);assert(!calls[0].body.attachments);assert(!/api\/auth|magic-link|Bearer|ND|resultText|api\/test-reports/.test(calls[0].body.text));
 await deliverKasAccessNotifications(db,env,{transport});assert.equal(calls.length,1);assert.equal((await db.prepare('SELECT status FROM kas_access_notifications WHERE id=?').bind(notice.notificationId).first()).status,'sent');
 const hidden=await call(buyer,{action:'workspace',requestId:notice.notificationId});assert.equal(hidden.targetRequest,null);assert.equal(hidden.notificationEmail,null);
 let workspace=await call(owner,{action:'workspace',requestId:notice.notificationId});assert.equal(workspace.targetRequest.id,notice.notificationId);assert.equal(workspace.targetRequest.status,'pending');assert.equal(workspace.permissions[0].notification_status,'sent');assert.equal((await reportPermission(db,buyer,'43301')).canReadResults,false);
 await call(owner,{action:'decline',email:buyer.email,reports:[{reportNumber:'43301',revision:1}]});workspace=await call(owner,{action:'workspace',requestId:notice.notificationId});assert.equal(workspace.targetRequest.status,'declined');assert.equal(workspace.targetRequest.request_revision,1);assert.equal(workspace.targetRequest.revision,2);
 // A new request cycle gets a new ID; provider failure leaves it queued, with a stable retry key.
 const again=await call(buyer,{action:'request',reportNumber:'43301',card:true});assert.notEqual(again.notificationId,notice.notificationId);let keys=[];
 await deliverKasAccessNotifications(db,env,{id:again.notificationId,transport:async(_u,o)=>{keys.push(o.headers['idempotency-key']);return new Response(null,{status:429});}});
 let row=await db.prepare('SELECT * FROM kas_access_notifications WHERE id=?').bind(again.notificationId).first();assert.equal(row.status,'pending');assert.equal(row.attempts,1);assert.equal(row.last_error,'provider_429');assert(row.next_attempt>Date.now());
 await deliverKasAccessNotifications(db,env,{id:again.notificationId,transport:async()=>{throw Error('Backoff not respected');}});
 await db.prepare('UPDATE kas_access_notifications SET next_attempt=0 WHERE id=?').bind(again.notificationId).run();await deliverKasAccessNotifications(db,env,{id:again.notificationId,transport:async(_u,o)=>{keys.push(o.headers['idempotency-key']);return Response.json({id:'retry'});}});assert.equal(keys[0],keys[1]);
 // A resolved request awaiting delivery is cancelled rather than sending a stale approval link.
 const resolved=await call(buyer,{action:'request',reportNumber:'43302',card:true});await call(owner,{action:'decline',email:buyer.email,reports:[{reportNumber:'43302',revision:0+1}]});await deliverKasAccessNotifications(db,env,{id:resolved.notificationId,transport:async()=>{throw Error('Resolved request emailed');}});assert.equal((await db.prepare('SELECT status FROM kas_access_notifications WHERE id=?').bind(resolved.notificationId).first()).status,'cancelled');
 // Card notifications are escaped and contain no source attachment. File-only legacy notifications fail closed.
 const cardNotice={id:crypto.randomUUID(),kind:'access_request',report_number:'43301',requester_email:'untrusted"@company.test',requested_results:1,requested_pdf:0,created_at:'TEST'};
 const msg=notificationMessage(cardNotice);assert(msg.text.includes('Requested access: digital TECRID card'));assert(msg.html.includes('untrusted&quot;@company.test'));assert.throws(()=>notificationMessage({...cardNotice,requested_results:0,requested_pdf:1}));
 const req=async(token)=>{const url='https://service.test/api/tecrid-request-notification',body={action:'delivery-test',to:'intruder@evil.test'};return new Request(url,token==='synthetic-service'?await signedServiceInit(url,body,env,'notification-worker'):{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(body)});};
 assert.equal((await notificationService(await req('wrong'),env,transport)).status,401);let before=calls.length;let smoke=await notificationService(await req('synthetic-service'),env,transport);assert.equal((await smoke.json()).notificationStatus,'sent');assert.equal(calls.length,before+1);assert.deepEqual(calls.at(-1).body.to,[KAS_REQUEST_EMAIL]);assert.match(calls.at(-1).body.text,/No access request was created/);await notificationService(await req('synthetic-service'),env,transport);assert.equal(calls.length,before+1);
 // The actual service handler sends a new verified request immediately after commit.
 const serviceReq=async verified=>{const url='https://service.test/api/tecrid-report-permissions';return new Request(url,await signedServiceInit(url,{action:'request',reportNumber:'43300',card:true,actor:{...buyer,emailVerified:verified}},env,'report-permission'));};
 before=calls.length;assert.equal((await reportPermissions(await serviceReq(false),env,transport)).status,403);assert.equal(calls.length,before);
 const accepted=await reportPermissions(await serviceReq(true),env,transport);assert.equal(accepted.status,200);assert.equal(calls.length,before+1);const delivered=await accepted.json();assert.equal((await db.prepare('SELECT status FROM kas_access_notifications WHERE id=?').bind(delivered.notificationId).first()).status,'sent');assert.equal((await reportPermission(db,buyer,'43300')).canReadResults,false);
 console.log('PASS: atomic request outbox, fixed Karen recipient, scopes, TEST-only content, authenticated review links, duplicate/race suppression, retry/backoff/idempotency, stale-request cancellation and service-only smoke check.');
}finally{await mf.dispose();}
