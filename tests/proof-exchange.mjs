import {seedKasandrinosProofFixture} from './support/kasandrinos-proof-fixture.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {proofRequest,proofProjection,receiveEvidence} from '../server/proof-exchange.js';
import {freshness} from '../server/proof-contract.js';
import {verifyCertification} from '../server/proof-registry.js';
import {proofWall,organizationPage,proofCounts} from '../public/proof.js';
import {teamRequest} from '../server/teams.js';
const now=Date.parse('2026-10-25T07:00:00Z');
const env={VLE_TECRID_RECEIVER_ENABLED:'true',VLE_TECRID_WEBHOOK_SECRET:'synthetic-test-secret-32-bytes-only',VLE_TECRID_RECIPIENT_ID:'vle-marketplace'};
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'});
let checks=0;
const check=(value,message)=>{assert(value,message);checks++;};
try{
 const db=await mf.getD1Database('DB');
 for(const file of readdirSync(new URL('../drizzle',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
 // This test explicitly opts into the held pilot fixture on disposable local D1.
 await seedKasandrinosProofFixture(db);
 const owner={userId:'synthetic-owner',email:'karen@paleofoundation.com'},brand={userId:'synthetic-brand',email:'synthetic@brand.test'},other={userId:'synthetic-other',email:'synthetic@other.test'},viewer={userId:'synthetic-viewer',email:'viewer@brand.test'};
 const teamCall=async(user,data)=>{const r=await teamRequest(new Request('https://vle.test/api/team',{method:'POST',headers:{origin:'https://vle.test'},body:JSON.stringify(data)}),db,user);assert.equal(r.status,200,await r.text());};
 await teamCall(owner,{action:'select',id:'kasandrinos-team'});
 await teamCall(brand,{action:'create',kind:'buyer',name:'SYNTHETIC test brand'});
 const brandId=(await db.prepare('SELECT team_id FROM team_selections WHERE user_id=?').bind(brand.userId).first()).team_id;
 await teamCall(other,{action:'create',kind:'buyer',name:'SYNTHETIC other brand'});
 const otherId=(await db.prepare('SELECT team_id FROM team_selections WHERE user_id=?').bind(other.userId).first()).team_id;
 await teamCall(brand,{action:'member',teamId:brandId,email:viewer.email,role:'viewer'});await teamCall(viewer,{action:'select',id:brandId});
 const call=async(user,data,status=200,organizationId=user===owner?'kasandrinos-team':user===other?otherId:brandId)=>{
  const response=await proofRequest(new Request('https://vle.test/api/proof',{method:'POST',headers:{origin:'https://vle.test','content-type':'application/json'},body:JSON.stringify({organizationId,...data})}),db,user,{});const body=await response.json();assert.equal(response.status,status,JSON.stringify(body));checks++;return body;
 };
 await call(brand,{action:'organization',slug:'synthetic-brand',roles:['brand','retailer']});
 await call(other,{action:'organization',slug:'synthetic-other',roles:['brand']});
 await call(viewer,{action:'organization',slug:'synthetic-brand',roles:['brand']},403);
 await call(brand,{action:'organization',slug:'kasandrinos',roles:['supplier']},409);
 await call(brand,{action:'organization',slug:'synthetic-brand',roles:['supplier']},403,'kasandrinos-team');
 await call(owner,{action:'lot',id:'KAS-227-KB',supplierLotId:'227 K/B',ingredientCode:'SYNTHETIC-EVOO',product:'Organic extra virgin olive oil'});
 await call(owner,{action:'lot',id:'SYNTHETIC-SECOND-LOT',supplierLotId:'SYNTHETIC-SECOND',ingredientCode:'SYNTHETIC-EVOO',product:'SYNTHETIC second lot'});
 // The signed SKU fallback remains usable when a lot also has an ingredient code.
 await call(owner,{action:'lot',id:'SYNTHETIC-SKU-LOT',supplierLotId:'SYNTHETIC-SKU',ingredientCode:'SYNTHETIC-INGREDIENT',productSku:'SYNTHETIC-SKU-ONLY',product:'SYNTHETIC SKU lot'});
 let projection=await proofProjection(db,{},now);
 const kas=()=>projection.organizations.find(o=>o.slug==='kasandrinos');
 check(kas().roles.length===3,'Kasandrinos holds all three required roles');
 check(kas().certifications.length===5,'Only the existing five source certification documents are seeded');
 check(kas().tecrids.length===0,'TEST records never become production evidence');
 check(kas().certifications.find(c=>c.id==='paleo-keto-archive').status==='expired','Historical Paleo letter stays expired');
 check(kas().certifications.find(c=>c.id==='organic-spices').scope.includes('Ares Pepper'),'Spices scope remains distinct');
 const release=await call(owner,{action:'assert-release',lotId:'KAS-227-KB',brandId,label:'SYNTHETIC private-label oil'});
 await call(owner,{action:'confirm-release',id:release.id},403);
 await call(other,{action:'confirm-release',id:release.id},403);
 await call(viewer,{action:'confirm-release',id:release.id},403);
 function envelope(overrides={}){
  return {schemaVersion:'vle-evidence/1',environment:'production',operation:'upsert',streamId:hash(JSON.stringify(['TEC-SYNTHETIC-ONLY',env.VLE_TECRID_RECIPIENT_ID])),deliveryId:crypto.randomUUID(),eventId:crypto.randomUUID(),sequence:1,event:'credential.issued',occurredAt:new Date(now).toISOString(),recipient:{type:'marketplace',organizationId:env.VLE_TECRID_RECIPIENT_ID},credential:{tecrid:'TEC-SYNTHETIC-ONLY',version:1,status:'active',program:'analytical-record',issuingLab:'SYNTHETIC laboratory',issuedAt:'2026-10-20T00:00:00Z',retestDue:'2026-12-25T00:00:00Z',verificationUrl:'https://tecrid.com/records/TEC-SYNTHETIC-ONLY',fingerprint:'a'.repeat(64),verification:{signatureVerified:true,fingerprintVerified:true,currentVersion:true},identity:{originatingSupplier:'tecrid-synthetic-supplier',mappingId:'synthetic-mapping',originatingSupplierId:'kasandrinos-team',lotId:'KAS-227-KB',supplierLotId:'227 K/B',ingredientCode:'SYNTHETIC-EVOO'}},grant:{id:'synthetic-grant',controllerOrganizationId:'tecrid-synthetic-brand',status:'active',accessLevel:'full_record',publicStatus:true,recipientOrganizationId:env.VLE_TECRID_RECIPIENT_ID,expiresAt:null,brandOrganizationIds:[brandId]},...overrides};
 }
 async function signed(data,{time=now,secret=env.VLE_TECRID_WEBHOOK_SECRET,alter=false,eventHeader=data.eventId}={}){
  if(data.operation==='upsert'){data.snapshot??={results:[]};data.snapshot.tecrid??=data.credential.tecrid;data.snapshot.version??=data.credential.version;data.snapshot.resultsAccess??={accessLevel:data.grant.accessLevel};data.snapshotFingerprint??=hash(JSON.stringify(data.snapshot));}
  const text=JSON.stringify(data),timestamp=String(Math.floor(time/1000));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+text))),x=>x.toString(16).padStart(2,'0')).join('');
  return new Request('https://vle.test/api/integrations/tecrid/deliveries',{method:'POST',headers:{'content-type':'application/json','X-TECRID-Signature':`t=${timestamp},v1=${signature}`,'X-TECRID-Event-Id':eventHeader},body:alter?text+' ':text});
 }
 const receive=async(data,status=202,options={},config=env)=>{const response=await receiveEvidence(await signed(data,options),db,config,now);const body=await response.json();assert.equal(response.status,status,JSON.stringify(body));checks++;return body;};
 let data=envelope();
 await receive(data,503,{},{});
 await receive(data,401,{alter:true});await receive(data,401,{secret:'wrong synthetic secret'});await receive(data,401,{time:now-301000});await receive(data,401,{time:now+301000});await receive(data,400,{eventHeader:'wrong-event'});
 await receive(envelope({environment:'sandbox'}),422);
 await receive(envelope({recipient:{type:'marketplace',organizationId:'wrong'}}),403);
 let invalid=envelope();invalid.credential.verification.signatureVerified=false;await receive(invalid,422);
 invalid=envelope();invalid.credential.verification.currentVersion=false;await receive(invalid,422);
 invalid=envelope();invalid.credential.identity={originatingSupplier:'tecrid-synthetic-supplier',mappingId:'synthetic-mapping',originatingSupplierId:'kasandrinos-team',ingredientCode:'SYNTHETIC-EVOO'};await receive(invalid,422); // ambiguous code
 invalid=envelope();invalid.credential.identity.ingredientCode='wrong';await receive(invalid,422);
 invalid=envelope();invalid.credential.verificationUrl='https://evil.test/records/TEC-SYNTHETIC-ONLY';await receive(invalid,400);
 // Full-record data is retained privately and never enters the public projection.
 data.snapshot={results:[{analyte:'SYNTHETIC-SECRET-RESULT',value:12345}]};
 delete data.snapshotFingerprint;
 await receive(data);const duplicate=await receive(data,200);check(duplicate.duplicate,'Exact retry is idempotent');
 await receive({...data,sequence:2},409);
 projection=await proofProjection(db,{},now);
 check(kas().tecrids.length===1,'Supplier sees the delivered lot status');
 check(projection.organizations.find(o=>o.id===brandId).tecrids.length===0,'Pending release carries no proof');
 check(!JSON.stringify(projection).includes('SYNTHETIC-SECRET-RESULT'),'No result values in any public projection');
 check(!JSON.stringify(projection).includes('12345'),'No numeric snapshot values leak');
 check(kas().tecrids[0].accessLevel==='status_only','Public projection always status only');
 check(!('fingerprint' in kas().tecrids[0]),'Only public status fields are projected');
 await call(brand,{action:'confirm-release',id:release.id});await call(brand,{action:'confirm-release',id:release.id},409);
 projection=await proofProjection(db,{},now);
 check(projection.organizations.find(o=>o.id===brandId).tecrids.length===1,'Proof follows confirmed release within the grant');
 check(projection.organizations.find(o=>o.id===otherId).tecrids.length===0,'Unrelated brand gets no proof');
 const otherRelease=await call(owner,{action:'assert-release',lotId:'KAS-227-KB',brandId:otherId,label:'SYNTHETIC ungranted brand'});await call(other,{action:'confirm-release',id:otherRelease.id});
 projection=await proofProjection(db,{},now);check(projection.organizations.find(o=>o.id===otherId).tecrids.length===0,'Confirmation alone cannot bypass the grant');
 await call(owner,{action:'lot',id:'KAS-227-KB',supplierLotId:'227 K/B',ingredientCode:'changed',product:'changed'},409);
 let next=structuredClone(data);next.deliveryId=crypto.randomUUID();next.eventId=crypto.randomUUID();next.sequence=3;next.event='credential.corrected';next.credential.version=2;next.credential.fingerprint='b'.repeat(64);next.snapshot.version=2;delete next.snapshotFingerprint;await receive(next);
 const old=structuredClone(data);old.deliveryId=crypto.randomUUID();old.eventId=crypto.randomUUID();old.sequence=2;await receive(old);
 projection=await proofProjection(db,{},now);check(kas().tecrids[0].version===2,'Late event cannot roll back current evidence');
 let revoke=structuredClone(next);revoke.deliveryId=crypto.randomUUID();revoke.eventId=crypto.randomUUID();revoke.sequence=4;revoke.event='grant.revoked';revoke.grant.status='revoked';revoke.operation='tombstone';revoke.reason='synthetic_grant_withdrawal';revoke.grant.publicStatus=false;revoke.grant.brandOrganizationIds=[];delete revoke.snapshot;delete revoke.snapshotFingerprint;await receive(revoke);
 projection=await proofProjection(db,{},now);check(kas().tecrids.length===0,'Grant revocation removes public evidence immediately');check(projection.organizations.find(o=>o.id===brandId).tecrids.length===0,'Grant revocation removes downstream evidence');
 // Credential withdrawal removes retained findings and public proof; audit metadata remains.
 revoke=structuredClone(next);revoke.deliveryId=crypto.randomUUID();revoke.eventId=crypto.randomUUID();revoke.sequence=5;revoke.event='credential.revoked';revoke.credential.status='revoked';revoke.operation='tombstone';revoke.reason='synthetic_credential_revocation';revoke.grant.status='revoked';revoke.grant.publicStatus=false;revoke.grant.brandOrganizationIds=[];delete revoke.snapshot;delete revoke.snapshotFingerprint;await receive(revoke);
 projection=await proofProjection(db,{},now);check(kas().tecrids.length===0,'Revoked evidence is removed from public proof');check((await db.prepare('SELECT snapshot_json FROM lot_tecrid_grants WHERE tecrid=?').bind(revoke.credential.tecrid).first()).snapshot_json===null,'Revoked private payload is dropped');check(proofCounts(kas()).startsWith('0 active'),'Count includes active credentials only');
 await call(brand,{action:'withdraw-release',id:release.id});projection=await proofProjection(db,{},now);check(projection.organizations.find(o=>o.id===brandId).tecrids.length===0,'Withdrawing a release removes inherited proof');
 const expiry=structuredClone(revoke);expiry.deliveryId=crypto.randomUUID();expiry.eventId=crypto.randomUUID();expiry.sequence=6;expiry.grant.expiresAt='2026-10-24T00:00:00Z';await receive(expiry);projection=await proofProjection(db,{},now);check(kas().tecrids.length===0,'Expired grant never reveals proof');
 const privateStatus=structuredClone(revoke);privateStatus.deliveryId=crypto.randomUUID();privateStatus.eventId=crypto.randomUUID();privateStatus.sequence=7;privateStatus.grant.publicStatus=false;await receive(privateStatus);projection=await proofProjection(db,{},now);check(kas().tecrids.length===0,'Marketplace access does not imply consent to public status');
 const sku=envelope();sku.credential.tecrid='TEC-SYNTHETIC-SKU';sku.credential.verificationUrl='https://tecrid.com/records/TEC-SYNTHETIC-SKU';sku.streamId=hash(JSON.stringify([sku.credential.tecrid,env.VLE_TECRID_RECIPIENT_ID]));sku.credential.identity={originatingSupplier:'tecrid-synthetic-supplier',mappingId:'synthetic-mapping',originatingSupplierId:'kasandrinos-team',productSku:'SYNTHETIC-SKU-ONLY'};await receive(sku);
 projection=await proofProjection(db,{},now);check(projection.lots.find(l=>l.id==='SYNTHETIC-SKU-LOT').tecrids.length===1,'Signed productSku fallback matches the SKU even when an ingredientCode is also registered');
 // Event id deduplication and simultaneous retries preserve one receipt.
 const concurrent=envelope({deliveryId:'synthetic-concurrent',eventId:'synthetic-concurrent-event',sequence:8});concurrent.credential.version=3;concurrent.credential.fingerprint='c'.repeat(64);
 const race=await Promise.all([receiveEvidence(await signed(concurrent),db,env,now),receiveEvidence(await signed(concurrent),db,env,now)]);check(race.every(r=>[200,202].includes(r.status)),'Concurrent identical deliveries are accepted idempotently');
 check((await db.prepare('SELECT count(*) n FROM proof_delivery_receipts WHERE delivery_id=?').bind(concurrent.deliveryId).first()).n===1,'Only one durable receipt');
 await receive({...concurrent,deliveryId:'different-delivery'},409);
 const receipts=await (await proofRequest(new Request('https://vle.test/api/proof'),db,owner,{})).json();check(receipts.receipts.length>0&&receipts.receipts.every(r=>r.received_at),'Originating supplier receives a timestamped delivery log');
 const anon=await (await proofRequest(new Request('https://vle.test/api/proof'),db,null,{})).json();check(anon.receipts.length===0,'Anonymous visitors cannot read delivery logs');
 const stranger=await (await proofRequest(new Request('https://vle.test/api/proof'),db,other,{})).json();check(stranger.receipts.length===0,'Other accounts cannot read supplier delivery logs');
 check((await db.prepare('SELECT count(*) n FROM proof_audit').first()).n>=8,'Mutations leave an audit record');
 check(freshness('2026-10-24T00:00:00Z',now)==='lapsed'&&freshness('2026-11-01T00:00:00Z',now)==='due'&&freshness('2027-01-01T00:00:00Z',now)==='current','Freshness is calculated from the retest date');
 const cert={id:'synthetic-cert',registry:'ics',registry_id:'SYNTHETIC-ICS',program:'SYNTHETIC program',scope:'SYNTHETIC scope',lot_id:null,reported_status:'active',expires_at:null};
 const org={slug:'synthetic-brand'};const registryEnv={VLE_ICS_REGISTRY_URL:'https://contaminantstandards.com/api/operator-confirmed-contract'};
 const record={id:cert.registry_id,organizationSlug:org.slug,program:cert.program,scope:cert.scope,lotId:null,status:'suspended',environment:'production'};
 const transport=async(url,options)=>{check(new URL(url).searchParams.get('certificateId')===cert.registry_id&&options.redirect==='manual','Registry query binds certificate identity without redirects');return Response.json({record});};
 let verified=await verifyCertification(cert,org,registryEnv,transport,now);check(verified.status==='suspended'&&verified.verification==='verified against registry','Live registry suspension is visible');
 record.status='expired';verified=await verifyCertification(cert,org,registryEnv,transport,now);check(verified.status==='expired','Live registry expiry is visible');
 record.status='active';record.demo=true;verified=await verifyCertification(cert,org,registryEnv,transport,now);check(verified.verification.includes('registry verification unavailable'),'Demo registry records cannot verify a certification');delete record.demo;
 record.scope='wrong';verified=await verifyCertification(cert,org,registryEnv,transport,now);check(verified.verification.includes('registry verification unavailable'),'Registry scope mismatch fails closed');record.scope=cert.scope;
 verified=await verifyCertification({...cert,registry:'paleo'},org,{VLE_PALEO_REGISTRY_URL:'https://evil.test/api'},transport,now);check(verified.verification.includes('registry verification unavailable'),'Untrusted registry origin rejected');
 verified=await verifyCertification({...cert,registry:null},org,{},transport,now);check(verified.verification==='self-reported, not verified','Other issuers never receive registry verification by assertion');
 const html=organizationPage({...kas(),name:'<script>SYNTHETIC</script>'},projection.organizations);check(!html.includes('<script>'),'Organization titles are escaped');check(html.includes('Proof wall')&&!html.includes('Edit site'),'Proof wall renders without editor chrome');
 const wall=proofWall({tecrids:[],certifications:[{...cert,title:'<img src=x>',issuer:'SYNTHETIC issuer',status:'expired',verification:'self-reported, not verified'}]});check(wall.includes('&lt;img')&&wall.includes('expired'),'Certification rendering escapes text and retains expired status');
 console.log(`PASS: ${checks} proof exchange checks. Real D1 migrations, roles, two-sided release authorization, HMAC, replay and concurrency, signed lot identity, disclosure, correction/revocation, registry status, expiry, freshness, audit, receipt isolation and escaping.`);
}finally{await mf.dispose();}
