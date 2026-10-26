import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {readdirSync,readFileSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {randomBytes} from 'node:crypto';
import {receiveEvidence,proofProjection} from '../server/proof-exchange.js';
import {digest} from '../server/proof-contract.js';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/tecrid-native-stream.json',import.meta.url),'utf8'));
let mf,db;const now=Date.now(),recipient=fixtures[0].recipient.organizationId;
const env={VLE_TECRID_RECEIVER_ENABLED:'true',VLE_TECRID_RECIPIENT_ID:recipient,VLE_TECRID_WEBHOOK_SECRET:randomBytes(32).toString('hex')};
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-22',d1Databases:['DB']});db=await mf.getD1Database('DB');
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
 await db.prepare('INSERT INTO team_accounts(id,name,kind,owner_email,contact_email,created_at) VALUES (?,?,?,?,?,?)').bind('vle-supplier','Synthetic stream supplier','supplier','owner@native.test','owner@native.test',new Date(now).toISOString()).run();
 await db.prepare('INSERT INTO proof_organizations(id,team_id,slug,name) VALUES (?,?,?,?)').bind('vle-supplier','vle-supplier','synthetic-stream-supplier','Synthetic stream supplier').run();
 await db.prepare('INSERT INTO organization_roles(organization_id,role) VALUES (?,?)').bind('vle-supplier','supplier').run();
 await db.prepare('INSERT INTO proof_lots(id,supplier_id,supplier_lot_id,ingredient_code,product_sku,product) VALUES (?,?,?,?,?,?)').bind('native-lot','vle-supplier','SYNTHETIC-LOT','synthetic-ingredient','SEC-SKU','Synthetic ingredient').run();
});
after(async()=>{await mf?.dispose();});
async function signed(data){const body=JSON.stringify(data),time=String(Math.floor(now/1000)),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.VLE_TECRID_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const h=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(time+'.'+body))),b=>b.toString(16).padStart(2,'0')).join('');return new Request('https://vle.test/api/integrations/tecrid/deliveries',{method:'POST',headers:{'content-type':'application/json','x-tecrid-signature':`t=${time},v1=${h}`,'x-tecrid-event-id':data.eventId},body});}
async function receive(data,status=202,config=env){const r=await receiveEvidence(await signed(data),db,config,now);const result=await r.json();assert.equal(r.status,status,JSON.stringify(result));return result;}
const fresh=async(tecrid='TECRID·SYNTHETIC-26-NATIVE')=>{
 const body=structuredClone(fixtures.find(f=>f.operation==='upsert'));body.credential.tecrid=tecrid;body.credential.version=1;body.credential.status='active';body.credential.fingerprint='a'.repeat(64);body.credential.verificationUrl='https://tecrid.com/records/'+encodeURIComponent(tecrid);body.credential.verification={signatureVerified:true,fingerprintVerified:true,currentVersion:true};
 body.streamId=await digest(JSON.stringify([tecrid,recipient]));body.eventId=crypto.randomUUID();body.deliveryId=body.eventId;body.sequence=1;body.event='credential.issued';body.occurredAt=new Date(now).toISOString();body.grant={...body.grant,id:'native-full',controllerOrganizationId:'native-brand',status:'active',accessLevel:'full_record',publicStatus:true,brandOrganizationIds:[],supersedesGrantId:null};
 body.snapshot={tecrid,version:1,results:[{analyte:'Synthetic analyte',resultText:'SYNTHETIC-PRIVATE',unit:'test-unit'}],resultsAccess:{accessLevel:'full_record'}};body.snapshotFingerprint=await digest(JSON.stringify(body.snapshot));return body;
};
const event=(base,sequence)=>({...structuredClone(base),sequence,eventId:crypto.randomUUID(),deliveryId:crypto.randomUUID()});
function withdraw(base,sequence,kind='grant.revoked'){const b=event(base,sequence);b.event=kind;b.operation='tombstone';b.reason='synthetic_withdrawal';b.grant.status='revoked';b.grant.publicStatus=false;b.grant.brandOrganizationIds=[];b.credential.verification={signatureVerified:false,fingerprintVerified:false,currentVersion:false};if(kind==='credential.revoked')b.credential.status='revoked';delete b.snapshot;delete b.snapshotFingerprint;return b;}
test('accepts all thirteen exact metadata/tombstone fixtures from the tested TECRID producer',async()=>{
 for(const body of fixtures)await receive(body);
 for(const b of fixtures){const row=await db.prepare('SELECT * FROM proof_delivery_receipts WHERE event_id=?').bind(b.eventId).first();assert(row);assert.equal(row.stream_id,b.streamId);}
 const snapshots=(await db.prepare('SELECT snapshot_json FROM lot_tecrid_grants WHERE snapshot_json IS NOT NULL').all()).results;assert(snapshots.every(r=>JSON.parse(r.snapshot_json).results.length===0));
});
let first,second;
test('stores independent scoped grants privately while public proof stays metadata only',async()=>{
 first=await fresh();await receive(first);await receive(first,200);
 assert((await db.prepare('SELECT snapshot_json FROM lot_tecrid_grants WHERE tecrid=? AND grant_id=?').bind(first.credential.tecrid,first.grant.id).first()).snapshot_json.includes('SYNTHETIC-PRIVATE'));
 const projection=await proofProjection(db,{},now);assert(!JSON.stringify(projection).includes('SYNTHETIC-PRIVATE'));assert.equal(projection.lots.find(l=>l.id==='native-lot').tecrids.filter(t=>t.tecrid===first.credential.tecrid).length,1);
 second=event(first,2);second.grant.id='native-status';second.grant.accessLevel='status_only';second.snapshot.results=[];second.snapshot.resultsAccess.accessLevel='status_only';second.snapshotFingerprint=await digest(JSON.stringify(second.snapshot));await receive(second);
 assert.equal((await db.prepare('SELECT count(*) n FROM lot_tecrid_grants WHERE tecrid=?').bind(first.credential.tecrid).first()).n,2);
});
test('revokes only the targeted grant and delayed or conflicting events cannot restore it',async()=>{
 const tombstone=withdraw(first,3);await receive(tombstone);
 const full=await db.prepare('SELECT * FROM lot_tecrid_grants WHERE tecrid=? AND grant_id=?').bind(first.credential.tecrid,first.grant.id).first();assert.equal(full.snapshot_json,null);assert.equal(full.grant_status,'revoked');
 assert.notEqual((await db.prepare('SELECT snapshot_json FROM lot_tecrid_grants WHERE tecrid=? AND grant_id=?').bind(first.credential.tecrid,second.grant.id).first()).snapshot_json,null);
 const old=event(first,1);await receive(old,409);
 const swapped=structuredClone(tombstone);swapped.sequence=99;await receive(swapped,409);
 const bad=withdraw(second,4);bad.snapshot={results:['SYNTHETIC-PRIVATE']};await receive(bad,422);
 await receive(withdraw(second,4));assert.equal((await db.prepare('SELECT count(*) n FROM lot_tecrid_grants WHERE tecrid=? AND snapshot_json IS NOT NULL').bind(first.credential.tecrid).first()).n,0);
});
test('a tombstone received first prevents a late unseen upsert from storing findings',async()=>{
 const base=await fresh('TECRID·SYNTHETIC-26-TOMBSTONE');await receive(withdraw(base,3));const late=await receive(base);assert(late.stale);assert.equal((await db.prepare('SELECT snapshot_json FROM lot_tecrid_grants WHERE tecrid=?').bind(base.credential.tecrid).first()).snapshot_json,null);
});
test('replacement identity, controller isolation and current credential versions survive concurrency',async()=>{
 const corrected=event(second,5);corrected.credential.version=2;corrected.credential.fingerprint='b'.repeat(64);corrected.event='credential.corrected';corrected.snapshot.version=2;corrected.snapshotFingerprint=await digest(JSON.stringify(corrected.snapshot));corrected.grant.id='native-corrected';await receive(corrected);
 await receive(event(second,6),409);const swapped=event(corrected,6);swapped.grant.controllerOrganizationId='wrong-controller';await receive(swapped,409);
 const replacement=event(corrected,6);replacement.grant.id='native-replacement';replacement.grant.supersedesGrantId=corrected.grant.id;await receive(replacement);
 assert.equal((await db.prepare('SELECT snapshot_json FROM lot_tecrid_grants WHERE tecrid=? AND grant_id=?').bind(first.credential.tecrid,corrected.grant.id).first()).snapshot_json,null);
 await receive(event(corrected,7),409);await receive(withdraw(replacement,7));await receive(event(corrected,8),409);
 const revoked=withdraw(replacement,8,'credential.revoked');revoked.credential.version=3;revoked.credential.fingerprint='c'.repeat(64);
 const concurrent=await Promise.all(Array.from({length:4},async()=>receiveEvidence(await signed(revoked),db,env,now)));assert(concurrent.every(r=>[200,202].includes(r.status)));
 assert.equal((await db.prepare('SELECT count(*) n FROM proof_delivery_receipts WHERE event_id=?').bind(revoked.eventId).first()).n,1);
 await receive(event(corrected,9),409);assert.equal((await db.prepare('SELECT count(*) n FROM lot_tecrid_grants WHERE tecrid=? AND snapshot_json IS NOT NULL').bind(first.credential.tecrid).first()).n,0);
});
test('validates raw scope, supplier namespaces, fingerprint, recipient and disabled gate before storage',async()=>{
 const valid=await fresh('TECRID·SYNTHETIC-26-INVALID');await receive(valid,503,{});
 let b=structuredClone(valid);b.credential.identity.originatingSupplier=null;await receive(b,400);
 b=structuredClone(valid);b.snapshotFingerprint='0'.repeat(64);await receive(b,422);
 b=structuredClone(valid);b.streamId='0'.repeat(64);await receive(b,422);
 b=structuredClone(valid);b.grant.accessLevel='status_only';b.snapshot.resultsAccess.accessLevel='status_only';await receive(b,422);
 b=structuredClone(valid);b.recipient.organizationId='wrong';await receive(b,403);
 b=structuredClone(valid);b.operation=null;await receive(b,422);
 b=structuredClone(valid);b.credential.program='Invented certification';await receive(b,422);
 assert.equal((await db.prepare('SELECT count(*) n FROM lot_tecrid_grants WHERE tecrid=?').bind(valid.credential.tecrid).first()).n,0);
});
test('an active private grant never implies public proof consent',async()=>{
 const body=await fresh('TECRID·SYNTHETIC-26-PRIVATE');body.grant.publicStatus=false;await receive(body);
 assert((await db.prepare('SELECT snapshot_json FROM lot_tecrid_grants WHERE tecrid=?').bind(body.credential.tecrid).first()).snapshot_json);
 assert(!(await proofProjection(db,{},now)).lots.find(l=>l.id==='native-lot').tecrids.some(t=>t.tecrid===body.credential.tecrid));
});
