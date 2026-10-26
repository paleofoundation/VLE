import {teamRole,selectedTeam} from './teams.js';
import {ProofError,required,identifier,dateValue,verifyDelivery,validateEnvelope,freshness} from './proof-contract.js';
import {verifyCertification} from './proof-registry.js';
import {acceptEvidenceStream} from './proof-stream.js';
const roles=['supplier','brand','private_label_manufacturer','retailer','certification_body'];
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
const json=(value,status=200)=>Response.json(value,{status,headers});
const rows=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const stamp=()=>new Date().toISOString();
const audit=(db,org,action,subject,user)=>db.prepare('INSERT INTO proof_audit VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),org,action,subject,user.email,stamp());
async function manager(db,user,orgId){
 if(!user)throw new ProofError('Sign in to manage proof.',401);
 const team=await db.prepare('SELECT t.* FROM team_accounts t JOIN proof_organizations o ON o.team_id=t.id WHERE o.id=?').bind(orgId).first();
 if(!team||!['owner','admin'].includes(await teamRole(db,team,user)))throw new ProofError('Organization owner or administrator required.',403);
 return team;
}
async function hasRole(db,id,role){return !!await db.prepare('SELECT 1 FROM organization_roles WHERE organization_id=? AND role=?').bind(id,role).first();}
export async function receiveEvidence(request,db,env,now=Date.now()){
 try{
  if(env.VLE_TECRID_RECEIVER_ENABLED!=='true')throw new ProofError('Marketplace contract is awaiting approval.',503);
  const {data,bodyHash}=await verifyDelivery(request,env.VLE_TECRID_WEBHOOK_SECRET,now);
  validateEnvelope(data,env.VLE_TECRID_RECIPIENT_ID,now);
  const result=await acceptEvidenceStream(data,bodyHash,db,now);
  return json(result,result.duplicate?200:202);
 }catch(error){return json({error:error instanceof ProofError?error.message:'Evidence could not be accepted.'},error.status||503);}
}
export async function proofProjection(db,env={},now=Date.now(),transport=fetch){
 const [orgs,roleRows,lots,releases,credentials,certificates]=await Promise.all([
  rows(db,'SELECT id,slug,name FROM proof_organizations'),rows(db,'SELECT * FROM organization_roles'),rows(db,'SELECT * FROM proof_lots'),
  rows(db,'SELECT id,lot_id,brand_id,label,asserted_at,confirmed_at,withdrawn_at FROM lot_releases WHERE withdrawn_at IS NULL'),
  rows(db,"SELECT g.* FROM lot_tecrid_grants g JOIN proof_stream_state s ON s.stream_id=g.stream_id WHERE g.public_status=1 AND g.grant_status='active' AND g.status='active' AND s.credential_status='active' AND g.version=s.credential_version AND (g.grant_expires_at IS NULL OR g.grant_expires_at>?)",new Date(now).toISOString()),rows(db,'SELECT * FROM proof_certifications')
 ]);
 // Public proof is metadata only; grant snapshots never enter a public projection.
 const unique=items=>[...new Map(items.sort((a,b)=>a.version-b.version||a.sequence-b.sequence).map(item=>[item.tecrid,item])).values()];
 const proof=c=>({tecrid:c.tecrid,lotId:c.lot_id,version:c.version,status:c.status,program:c.program,issuingLab:c.issuing_lab,issuedAt:c.issued_at,retestDue:c.retest_due,freshness:freshness(c.retest_due,now),verificationUrl:c.verification_url,accessLevel:'status_only',receivedAt:c.received_at});
 const certs=await Promise.all(certificates.map(c=>verifyCertification(c,orgs.find(o=>o.id===c.organization_id),env,transport,now)));
 const organizationWalls=orgs.map(o=>{
  const own=lots.filter(l=>l.supplier_id===o.id).map(l=>l.id),confirmed=releases.filter(r=>r.brand_id===o.id&&r.confirmed_at).map(r=>r.lot_id);
  const visible=credentials.filter(c=>own.includes(c.lot_id)||confirmed.includes(c.lot_id)&&JSON.parse(c.brand_ids).includes(o.id));
  return {...o,roles:roleRows.filter(r=>r.organization_id===o.id).map(r=>r.role),tecrids:unique(visible).map(proof),certifications:certs.filter(c=>c.organization_id===o.id),lots:lots.filter(l=>own.includes(l.id)||confirmed.includes(l.id)),releases:releases.filter(r=>r.brand_id===o.id||own.includes(r.lot_id))};
 });
 return {organizations:organizationWalls,lots:lots.map(l=>({...l,tecrids:unique(credentials.filter(c=>c.lot_id===l.id)).map(proof),certifications:certs.filter(c=>c.lot_id===l.id),releases:releases.filter(r=>r.lot_id===l.id)}))};
}
export async function proofRequest(request,db,user,env={}){
 try{
  if(request.method==='GET'){
   const projection=await proofProjection(db,env);
   const team=user?await selectedTeam(db,user):null;
   const managed=team&&['owner','admin'].includes(team.role)?team.id:null;
   const receipts=managed?await rows(db,'SELECT r.delivery_id,r.event_id,r.tecrid,r.sequence,r.received_at FROM proof_delivery_receipts r JOIN proof_lots l ON l.id=r.lot_id WHERE l.supplier_id=? ORDER BY r.received_at DESC LIMIT 50',managed):[];
   return json({...projection,managedOrganizationId:managed,receipts});
  }
  if(request.method!=='POST')throw new ProofError('Method not allowed.',405);
  if(!user)throw new ProofError('Sign in to manage proof.',401);
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new ProofError('Same-origin request required.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ProofError('JSON required.',415);
  const raw=await request.text();if(raw.length>10000)throw new ProofError('Request too large.',413);
  const d=JSON.parse(raw);
  const team=await selectedTeam(db,user);
  if(!team||!['owner','admin'].includes(team.role)||d.organizationId!==team.id)throw new ProofError('Use the active organization owner or administrator account.',403);
  if(d.action==='organization'){
   const slug=required(d.slug,'public slug',80);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new ProofError('Invalid public slug.');
   if(!Array.isArray(d.roles)||!d.roles.length||d.roles.some(r=>!roles.includes(r)))throw new ProofError('Choose organization roles.');
   const existing=await db.prepare('SELECT * FROM proof_organizations WHERE id=?').bind(team.id).first();
   if(existing&&existing.slug!==slug)throw new ProofError('An existing public slug cannot be changed.',409);
   // Roles are additive so a role change cannot sever existing lot provenance.
   await db.batch([db.prepare('INSERT INTO proof_organizations VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name').bind(team.id,team.id,slug,team.name),...d.roles.map(r=>db.prepare('INSERT OR IGNORE INTO organization_roles VALUES (?,?)').bind(team.id,r)),audit(db,team.id,'organization.roles',team.id,user)]);
   return json({ok:true});
  }
  await manager(db,user,team.id);
  if(d.action==='lot'){
   if(!await hasRole(db,team.id,'supplier'))throw new ProofError('Supplier role required.',403);
   const id=identifier(d.id,'lot ID'),supplierLot=required(d.supplierLotId,'supplier lot ID'),code=required(d.ingredientCode||d.productSku,'ingredient code or SKU');
   const existing=await db.prepare('SELECT * FROM proof_lots WHERE id=?').bind(id).first();
   if(existing){
    if(existing.supplier_id!==team.id||existing.supplier_lot_id!==supplierLot)throw new ProofError('Lot ownership or identity mismatch.',409);
    if(await db.prepare('SELECT 1 FROM lot_tecrids WHERE lot_id=? UNION ALL SELECT 1 FROM lot_tecrid_grants WHERE lot_id=?').bind(id,id).first())throw new ProofError('Evidence-bound lot identity is immutable.',409);
    await db.batch([db.prepare('UPDATE proof_lots SET ingredient_code=?,product_sku=? WHERE id=?').bind(d.ingredientCode?code:null,d.ingredientCode?(d.productSku?required(d.productSku,'SKU'):null):code,id),audit(db,team.id,'lot.identity',id,user)]);
   }else await db.batch([db.prepare('INSERT INTO proof_lots VALUES (?,?,?,?,?,?)').bind(id,team.id,supplierLot,d.ingredientCode?code:null,d.ingredientCode?(d.productSku?required(d.productSku,'SKU'):null):code,required(d.product,'product')),audit(db,team.id,'lot.registered',id,user)]);
   return json({ok:true});
  }
  if(d.action==='assert-release'){
   const lot=await db.prepare('SELECT * FROM proof_lots WHERE id=?').bind(identifier(d.lotId)).first();
   if(!lot||lot.supplier_id!==team.id||!await hasRole(db,team.id,'supplier'))throw new ProofError('Originating supplier required.',403);
   if(!await hasRole(db,identifier(d.brandId),'brand'))throw new ProofError('Registered brand role required.');
   const id=crypto.randomUUID();
   await db.batch([db.prepare('INSERT INTO lot_releases (id,lot_id,brand_id,label,asserted_by,asserted_at) VALUES (?,?,?,?,?,?)').bind(id,lot.id,d.brandId,required(d.label,'brand label'),user.email,stamp()),audit(db,team.id,'release.asserted',id,user)]);
   return json({ok:true,id});
  }
  if(['confirm-release','withdraw-release'].includes(d.action)){
   const release=await db.prepare('SELECT r.*,l.supplier_id FROM lot_releases r JOIN proof_lots l ON l.id=r.lot_id WHERE r.id=?').bind(identifier(d.id)).first();
   if(!release||release.withdrawn_at)throw new ProofError('Active release not found.',404);
   if(d.action==='confirm-release'){
    if(team.id!==release.brand_id||!await hasRole(db,team.id,'brand'))throw new ProofError('The named brand must confirm this release.',403);
    if(release.confirmed_at)throw new ProofError('Release is already confirmed.',409);
    await db.batch([db.prepare('UPDATE lot_releases SET confirmed_by=?,confirmed_at=? WHERE id=? AND confirmed_at IS NULL AND withdrawn_at IS NULL').bind(user.email,stamp(),release.id),audit(db,team.id,'release.confirmed',release.id,user)]);
   }else{
    if(![release.brand_id,release.supplier_id].includes(team.id))throw new ProofError('Release participant required.',403);
    await db.batch([db.prepare('UPDATE lot_releases SET withdrawn_at=? WHERE id=?').bind(stamp(),release.id),audit(db,team.id,'release.withdrawn',release.id,user)]);
   }
   return json({ok:true});
  }
  if(d.action==='certification'){
   const lotId=d.lotId?identifier(d.lotId):null;
   if(lotId&&!await db.prepare('SELECT 1 FROM proof_lots WHERE id=? AND supplier_id=?').bind(lotId,team.id).first())throw new ProofError('Originating lot supplier required.',403);
   const issuer=required(d.issuer,'issuer');
   const knownIssuer={'paleo foundation':'paleo','institute of contaminant standards':'ics','ics':'ics'}[issuer.toLowerCase()];
   const registry=knownIssuer||(['paleo','ics'].includes(d.registry)?d.registry:null);
   await db.batch([db.prepare('INSERT INTO proof_certifications (id,organization_id,lot_id,title,program,issuer,registry,registry_id,scope,issued_at,expires_at,reported_status,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),team.id,lotId,required(d.title,'title'),required(d.program,'program'),registry==='paleo'?'Paleo Foundation':registry==='ics'?'Institute of Contaminant Standards':issuer,registry,registry?required(d.registryId,'registry ID'):null,required(d.scope,'scope'),dateValue(d.issuedAt,'issued date',true),dateValue(d.expiresAt,'expiration',true),['active','expired','suspended','revoked','unknown'].includes(d.status)?d.status:'unknown',String(d.note||'').slice(0,1000)),audit(db,team.id,'certification.reported',d.registryId||d.title,user)]);
   return json({ok:true});
  }
  throw new ProofError('Unknown proof action.');
 }catch(error){return json({error:error instanceof ProofError?error.message:'Unable to update proof. Check the record and try again.'},error.status||400);}
}
