import {seedKasandrinosProofFixture} from './support/kasandrinos-proof-fixture.mjs';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Miniflare} from 'miniflare';
import {digest} from '../server/proof-contract.js';
const bindings={VLE_TECRID_RECEIVER_ENABLED:'true',VLE_TECRID_WEBHOOK_SECRET:'synthetic-worker-secret-for-local-tests',VLE_TECRID_RECIPIENT_ID:'vle-synthetic-marketplace'};
const calls=[];
const mf=new Miniflare({modulesRoot:resolve('dist/server'),modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...readdirSync('dist/server',{recursive:true}).filter(f=>typeof f==='string'&&/\.m?js$/.test(f)&&f!=='index.js').map(f=>({type:'ESModule',path:resolve('dist/server',f)}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings,outboundService:async request=>{calls.push(request.url);return new Response(null,{status:503});}});
try{
 const db=await mf.getD1Database('DB');
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
 // This test explicitly opts into the held pilot fixture on disposable local D1.
 await seedKasandrinosProofFixture(db);
 const base='https://vle.test';
 for(const path of ['/','/organizations/kasandrinos','/suppliers/kasandrinos','/lots/KAS-227-KB','/proof']){const r=await mf.dispatchFetch(base+path);assert.equal(r.status,200,path);const text=await r.text();assert(!text.includes('Edit site'));assert(text.includes('/app.js'));}
 let response=await mf.dispatchFetch(base+'/api/bootstrap');assert.equal(response.status,200);let body=await response.json();assert.equal(body.session.signedIn,false);assert.equal(body.proof.organizations[0].roles.length,3);assert.equal(body.proof.organizations[0].tecrids.length,0);assert.equal(body.proof.organizations[0].certifications.length,5);
 response=await mf.dispatchFetch(base+'/api/proof',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'{}'});assert.equal(response.status,401);
 response=await mf.dispatchFetch(base+'/api/integrations/tecrid/deliveries',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(response.status,401);
 const now=Date.now(),id='TECRID·SYNTHETIC-WORKER';
 const data={schemaVersion:'vle-evidence/1',environment:'production',operation:'upsert',streamId:await digest(JSON.stringify([id,bindings.VLE_TECRID_RECIPIENT_ID])),eventId:'synthetic-worker-event',deliveryId:'synthetic-worker-delivery',sequence:1,event:'credential.issued',occurredAt:new Date(now).toISOString(),recipient:{type:'marketplace',organizationId:bindings.VLE_TECRID_RECIPIENT_ID},credential:{tecrid:id,version:1,status:'active',program:'analytical-record',issuingLab:'SYNTHETIC lab',issuedAt:new Date(now).toISOString(),retestDue:null,verificationUrl:'https://tecrid.com/records/'+encodeURIComponent(id),fingerprint:'d'.repeat(64),verification:{signatureVerified:true,fingerprintVerified:true,currentVersion:true},identity:{originatingSupplier:'tecrid-synthetic-supplier',mappingId:'synthetic-worker-mapping',originatingSupplierId:'kasandrinos-team',lotId:'KAS-227-KB',supplierLotId:'227 K/B'}},grant:{id:'synthetic-worker-grant',controllerOrganizationId:'tecrid-synthetic-brand',status:'active',recipientOrganizationId:bindings.VLE_TECRID_RECIPIENT_ID,accessLevel:'full_record',publicStatus:true,expiresAt:null,brandOrganizationIds:[]},snapshot:{tecrid:id,version:1,results:['SYNTHETIC-PRIVATE-RESULT'],resultsAccess:{accessLevel:'full_record'}}};
 data.snapshotFingerprint=await digest(JSON.stringify(data.snapshot));
 const raw=JSON.stringify(data),timestamp=String(Math.floor(now/1000)),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(bindings.VLE_TECRID_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+raw))).toString('hex');
 const request={method:'POST',headers:{'content-type':'application/json','X-TECRID-Event-Id':data.eventId,'X-TECRID-Signature':`t=${timestamp},v1=${signature}`},body:raw};
 response=await mf.dispatchFetch(base+'/api/integrations/tecrid/deliveries',request);assert.equal(response.status,202,await response.text());
 response=await mf.dispatchFetch(base+'/api/integrations/tecrid/deliveries',request);assert.equal(response.status,200);assert.equal((await response.json()).duplicate,true);
 response=await mf.dispatchFetch(base+'/api/bootstrap');body=await response.json();assert.equal(body.proof.organizations[0].tecrids[0].tecrid,id);assert.equal(body.proof.organizations[0].tecrids[0].accessLevel,'status_only');assert(!JSON.stringify(body).includes('SYNTHETIC-PRIVATE-RESULT'));
 response=await mf.dispatchFetch(base+'/api/proof');body=await response.json();assert.deepEqual(body.receipts,[]);assert.equal(body.managedOrganizationId,null);assert(response.headers.get('cache-control').includes('no-store'));
 assert.equal((await db.prepare('SELECT count(*) n FROM proof_delivery_receipts').first()).n,1);
 assert.deepEqual(calls,[],'No external notification, registry, or report requests in Worker verification');
 console.log('PASS: built Worker routes, anonymous pages/bootstrap, private mutation rejection, real HMAC receiver, atomic receipt, idempotent retry, status-only public projection, private log isolation and zero outbound calls.');
}finally{await mf.dispose();}
