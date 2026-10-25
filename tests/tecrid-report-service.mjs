import {signedServiceInit,permissionAudience} from '../server/service-assertion.js';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {reportAccess,importTranscripts,validateTranscript,reportPermissions} from '../server/tecrid-report-service.ts';
import {reportPermission,reportPermissionRequest} from '../server/kasandrinos-report-permissions.js';
import {ensureKasTeam,teamRequest} from '../server/teams.js';
import {kasReports,tecridTestReference} from '../server/kasandrinos.js';
const reports=kasReports.filter(r=>tecridTestReference(r)),report=reports[0];
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],r2Buckets:['BUCKET'],compatibilityDate:'2026-05-15'});
try{
 const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('BUCKET');
 for(const f of readdirSync(new URL('../drizzle',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())for(const sql of readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
 await ensureKasTeam(db);
 const env={DB:db,BUCKET:bucket,TECRID_EMAIL_RELAY_SECRET:'test',TECRID_REPORT_READ_SECRET:'synthetic-read-'.repeat(4),TECRID_REPORT_PERMISSION_SECRET:'synthetic-permission-'.repeat(4),TECRID_REPORT_IMPORT_SECRET:'synthetic-import-'.repeat(4)};
 const owner={userId:'email:owner',email:'karen@paleofoundation.com',emailVerified:true},admin={userId:'email:admin',email:'tony@kasandrinos.com',emailVerified:true},buyer={userId:'email:buyer',email:'buyer@company.test',emailVerified:true};
 const req=async(body,token='test')=>new Request('https://service.test',token==='test'?await signedServiceInit('https://service.test',body,env,body.transcripts?'report-import':body.kind?'report-read':permissionAudience(body)):{method:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify(body)});
 const call=async(actor,input,status=200)=>{const r=await reportPermissions(await req({...input,actor}),env);const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));assert(r.headers.get('cache-control').includes('no-store'));return j;};
 const access=async(actor,r=report,kind='card')=>reportAccess(await req({actor,reportNumber:r.reportNumber,kind}),env,async()=>new TextEncoder().encode('%PDF-synthetic'));
 const transcripts=reports.map(r=>({reportNumber:r.reportNumber,sourceSha256:r.sha256,results:[{analyte:'Synthetic',resultText:'ND',unit:'ppb',loqText:'1 ppb',limitText:'',statusText:'',notes:''}]}));
 for(const r of reports)await bucket.put('kasandrinos/source-reports/'+r.sha256+'.pdf','%PDF-synthetic');
 assert.equal((await importTranscripts(await req({transcripts}),env)).status,200);
 assert.equal((await importTranscripts(await req({transcripts:transcripts.map(t=>({...t,sourceSha256:'wrong'}))}),env)).status,400);
 assert.equal((await reportAccess(await req({actor:buyer,reportNumber:report.reportNumber,kind:'results'},'bad'),env)).status,401);
 await call({...buyer,emailVerified:false},{action:'workspace'},403);
 assert.equal((await access({...buyer,emailVerified:false})).status,403);
 // A verified company email and even the same company domain grant no default access.
 for(const actor of [buyer,{...buyer,email:'stranger@kasandrinos.com'}]){assert.equal((await access(actor)).status,403);assert.equal((await access(actor,report,'pdf')).status,403);const w=await call(actor,{action:'workspace'});assert.equal(w.canManage,false);assert.deepEqual(w.permissions,[]);assert.deepEqual(w.events,[]);}
 assert.equal((await call(owner,{action:'workspace'})).reports.length,8);assert.equal((await call(admin,{action:'workspace'})).canManage,true);
 for(const r of reports){const response=await access(owner,r);assert.equal(response.status,200);const body=await response.json();assert.equal(body.productionAuthority,false);assert.equal(body.sourceSha256,r.sha256);}
 const pdf=await access(owner,report,'pdf');assert.equal(pdf.status,200);assert.equal(pdf.headers.get('x-report-sha256'),report.sha256);
 // Recipient requests are exact-email bound and do not grant access themselves.
 await call(buyer,{action:'request',reportNumber:report.reportNumber,card:true});await call(buyer,{action:'request',reportNumber:report.reportNumber,card:true});assert.equal((await access(buyer)).status,403);
 let w=await call(owner,{action:'workspace'});let p=w.permissions.find(x=>x.recipient_email===buyer.email);assert.equal(p.status,'pending');assert.equal(p.revision,1);
 const grant={action:'grant',email:buyer.email,reports:[{reportNumber:report.reportNumber,revision:1}],card:true};
 await call(buyer,grant,403);await call(admin,grant);
 assert.equal((await access(buyer)).status,200);assert.equal((await access(buyer,report,'pdf')).status,403);assert.equal((await access(buyer,reports[1])).status,403);
 await call(owner,grant,409); // stale second tab cannot overwrite the decision
 // File grants cannot be created, and legacy PDF-only rows never become card grants.
 await call(owner,{...grant,reports:[{reportNumber:report.reportNumber,revision:2}],card:false,pdf:true},400);
 await db.prepare('UPDATE kas_report_permissions SET results_access=0,pdf_access=1,revision=3 WHERE report_number=? AND recipient_email=?').bind(report.reportNumber,buyer.email).run();
 assert.equal((await access(buyer)).status,403);assert.equal((await access(buyer,report,'pdf')).status,403);
 assert.equal((await reportPermission(db,buyer,report.reportNumber)).canReadCard,false);
 await call(owner,{action:'revoke',email:buyer.email,reports:[{reportNumber:report.reportNumber,revision:3}]});
 assert.equal((await access(buyer)).status,403);assert.equal((await access(buyer,report,'pdf')).status,403);assert.equal((await reportPermission(db,buyer,report.reportNumber)).canReadPdf,false);
 // Select all eight, then revoke all eight; no collateral grant to another email.
 const all=reports.map(r=>({reportNumber:r.reportNumber,revision:r===report?4:0}));await call(owner,{action:'grant',email:buyer.email,reports:all,card:true,expiresAt:new Date(Date.now()+86400000).toISOString()});
 for(const r of reports){assert.equal((await access(buyer,r)).status,200);assert.equal((await access(buyer,r,'pdf')).status,403);}
 await call(owner,{action:'revoke',email:buyer.email,reports:all.map(r=>({...r,revision:r.revision+1}))});for(const r of reports)assert.equal((await access(buyer,r)).status,403);
 await call(owner,{action:'grant',email:buyer.email,reports:[{reportNumber:report.reportNumber,revision:6}],card:true,expiresAt:'2020-01-01'},400);
 await call(owner,{action:'grant',email:buyer.email,reports:[{reportNumber:'99999',revision:0}],results:true},400);
 await call(owner,{action:'grant',email:buyer.email,reports:[{reportNumber:report.reportNumber,revision:6},{reportNumber:reports[1].reportNumber,revision:0}],results:true},409);assert.equal((await access(buyer)).status,403);
 // Expiry is enforced in authorization, not only shown in the interface.
 await call(owner,{action:'grant',email:buyer.email,reports:[{reportNumber:report.reportNumber,revision:6}],card:true});await db.prepare('UPDATE kas_report_permissions SET expires_at=? WHERE recipient_email=?').bind('2020-01-01T00:00:00Z',buyer.email).run();assert.equal((await access(buyer)).status,403);
 // Revoking an existing team administrator removes management and controller viewing immediately.
 await db.prepare("UPDATE team_members SET role='revoked' WHERE team_id='kasandrinos-team' AND email=?").bind(admin.email).run();assert.equal((await call(admin,{action:'workspace'})).canManage,false);assert.equal((await access(admin)).status,403);await call(admin,{...grant,reports:[{reportNumber:reports[2].reportNumber,revision:0}]},403);
 // Concurrent decisions cannot silently overwrite each other.
 const concurrent={action:'grant',email:'concurrent@company.test',reports:[{reportNumber:reports[1].reportNumber,revision:0}],card:true};
 const race=await Promise.all([reportPermissions(await req({...concurrent,actor:owner}),env),reportPermissions(await req({...concurrent,actor:owner}),env)]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
 // The immutable audit preserves every decision and verified actor.
 w=await call(owner,{action:'workspace'});assert(w.events.some(e=>e.action==='request'&&e.actor_email===buyer.email));assert(w.events.some(e=>e.action==='revoke'&&e.actor_email===owner.email));
 assert.throws(()=>validateTranscript({...transcripts[0],sourceSha256:'wrong'},report));
 console.log('PASS: all eight source-bound TEST reports; owner/admin roles; exact-email requests; digital-card grants with controller-only source PDFs; grant, expiry, revoke; stale-write denial; role revocation; audit; private caching and service authentication.');
}finally{await mf.dispose();}
