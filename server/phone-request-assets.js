import {fingerprint,RequestError,text,ingredientCode} from './phone-request-policy.js';
import {verifyCertification} from './proof-registry.js';
import {freshness} from './proof-contract.js';
const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
const rows=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
async function asset(kind,source,title,view){return {id:await fingerprint([kind,source]),kind,title,source,view};}
export function digitizedInput(input){
 if(!['spec','coa'].includes(input.kind))throw new RequestError('Choose a specification or supplier report.');
 const product=text(input.product,'source product',200),lot=text(input.lot,'source lot',120),code=ingredientCode(input.ingredientCode);
 const payload={schemaVersion:'vle-digitized/1',product,lot,ingredientCode:code};
 if(input.kind==='coa'){
  payload.issuingLab=input.issuingLab==null?null:text(input.issuingLab,'source laboratory',200);
  payload.testedAt=input.testedAt==null?null:text(input.testedAt,'source test date',10);
  if(payload.testedAt&&(!/^\d{4}-\d{2}-\d{2}$/.test(payload.testedAt)||!Number.isFinite(Date.parse(payload.testedAt+'T00:00:00Z'))||new Date(payload.testedAt+'T00:00:00Z').toISOString().slice(0,10)!==payload.testedAt))throw new RequestError('Use the exact source test date or leave it not provided.');
  if(!Array.isArray(input.results)||!input.results.length||input.results.length>100)throw new RequestError('Provide one to 100 source-derived result rows.');
  if(input.results.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw new RequestError('Invalid result row.');
  payload.results=input.results.map(r=>({analyte:text(r.analyte,'analyte',160),resultText:r.resultText==null?null:text(r.resultText,'reported result',200),unit:r.unit==null?null:text(r.unit,'source unit',40),method:r.method==null?null:text(r.method,'source method',200)}));
 }else{
  if(!Array.isArray(input.fields)||!input.fields.length||input.fields.length>40)throw new RequestError('Provide the source specification fields.');
  if(input.fields.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw new RequestError('Invalid specification field.');
  payload.fields=input.fields.map(r=>({name:text(r.name,'field name',120),value:r.value==null?null:text(r.value,'source field',1000)}));
 }
 return payload;
}
// References are resolved on every read. Answer rows never retain these payloads.
export async function recordsOnFile(db,{supplierId,buyerId,ingredient,items},env={},transport=fetch,at=Date.now()){
 const offered=[];const iso=new Date(at).toISOString();
 if(items.some(k=>['spec','coa'].includes(k))){
  const documents=await rows(db,"SELECT d.*,s.body AS submission_body,s.file_key AS current_file_key FROM phone_document_records d JOIN supplier_submissions s ON s.id=d.submission_id WHERE d.owner_account_id=? AND d.ingredient_code=? AND d.status='active' AND s.owner_id=d.owner_account_id AND s.status='Reviewed' ORDER BY d.reviewed_at DESC,d.id",supplierId,ingredient);
  for(const doc of documents){
   if(!items.includes(doc.kind))continue;const payload=parse(doc.payload_json),submission=parse(doc.submission_body);
   if(doc.source_file_key!==doc.current_file_key||!payload||!submission||payload.schemaVersion!=='vle-digitized/1'||payload.ingredientCode!==ingredient||payload.lot!==submission.lot||payload.product!==submission.product)continue;
   const digest=await fingerprint([doc.kind,doc.source_hash,payload]);if(digest!==doc.record_fingerprint)continue;
   offered.push(await asset(doc.kind,{kind:'reviewed_supplier_document',id:doc.id,version:doc.version,fingerprint:digest},payload.product+' · '+payload.lot,{...payload,verification:'Supplier-provided source, digitized and reviewed. Not an authenticated laboratory credential or certification.'}));
  }
 }
 const supplier=await db.prepare('SELECT id,slug FROM proof_organizations WHERE team_id=?').bind(supplierId).first();
 const buyer=await db.prepare('SELECT id FROM proof_organizations WHERE team_id=?').bind(buyerId).first();
 const hasNative=await db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='lot_tecrid_grants'").first();
 if(supplier&&hasNative&&env.VLE_TECRID_RECEIVER_ENABLED==='true'&&env.VLE_TECRID_RECIPIENT_ID&&items.some(k=>['tecrid','coa'].includes(k))){
  const grants=await rows(db,`SELECT g.*,l.supplier_lot_id,l.product FROM lot_tecrid_grants g JOIN proof_stream_state s ON s.stream_id=g.stream_id JOIN proof_lots l ON l.id=g.lot_id
   WHERE l.supplier_id=? AND l.ingredient_code=? AND g.recipient_id=? AND g.status='active' AND g.grant_status='active' AND s.credential_status='active' AND g.version=s.credential_version AND g.fingerprint=s.credential_fingerprint AND g.tecrid=s.tecrid AND g.recipient_id=s.recipient_id AND g.lot_id=s.lot_id AND (g.grant_expires_at IS NULL OR g.grant_expires_at>?)`,supplier.id,ingredient,env.VLE_TECRID_RECIPIENT_ID,iso);
  for(const g of grants){
   const brands=parse(g.brand_ids);if(!Array.isArray(brands))continue;
   const release=buyer&&brands.includes(buyer.id)?await db.prepare('SELECT 1 FROM lot_releases WHERE lot_id=? AND brand_id=? AND confirmed_at IS NOT NULL AND withdrawn_at IS NULL').bind(g.lot_id,buyer.id).first():null;
   if(!g.public_status&&!release)continue;
   const source={kind:'native_tecrid_grant',id:g.tecrid,grantId:g.grant_id,version:g.version,fingerprint:g.fingerprint,snapshotFingerprint:g.snapshot_fingerprint};
   const metadata={tecrid:g.tecrid,lot:g.supplier_lot_id,product:g.product,program:g.program,issuingLab:g.issuing_lab,issuedAt:g.issued_at,retestDue:g.retest_due,freshness:freshness(g.retest_due,at),verificationUrl:g.verification_url,verification:'Authenticated TECRID record; a lab result is not a certification.'};
   if(items.includes('tecrid'))offered.push(await asset('tecrid',source,g.tecrid,metadata));
   const snapshot=parse(g.snapshot_json);
   if(items.includes('coa')&&release&&['results_only','full_record'].includes(g.access_level)&&snapshot?.resultsAccess===true&&Array.isArray(snapshot.results)&&snapshot.results.length){
    offered.push(await asset('coa',source,g.product+' · '+g.supplier_lot_id,{...metadata,results:snapshot.results.map(r=>({analyte:r.analyte??null,resultText:r.resultText??null,unit:r.unit??null,method:r.method??null})),verification:'Results in the current recipient-authorized TECRID scope.'}));
   }
  }
 }
 if(supplier&&items.includes('certification')){
  const certificates=await rows(db,`SELECT c.* FROM proof_certifications c LEFT JOIN proof_lots l ON l.id=c.lot_id WHERE c.organization_id=? AND (c.lot_id IS NULL OR l.supplier_id=? AND l.ingredient_code=?)`,supplier.id,supplier.id,ingredient);
  for(const cert of certificates){
   if(cert.program==='analytical-record')continue;
   const checked=await verifyCertification(cert,supplier,env,transport,at);
   if(checked.status!=='active'||checked.verification!=='verified against registry')continue;
   offered.push(await asset('certification',{kind:'registry_certificate',id:cert.id,registryId:cert.registry_id,scope:cert.scope,expiresAt:checked.expires_at},cert.title,{title:cert.title,program:cert.program,issuer:cert.issuer,scope:cert.scope,lotId:cert.lot_id,status:checked.status,expiresAt:checked.expires_at,checkedAt:checked.checkedAt,registryUrl:checked.registryUrl,verification:checked.verification}));
  }
 }
 if(items.includes('price')){
  const quotes=await rows(db,`SELECT r.id,r.version,r.record,l.product,l.supplier_lot_id FROM sourcing_rooms r JOIN proof_lots l ON l.id=r.lot JOIN proof_organizations o ON o.id=l.supplier_id WHERE r.buyer_id=? AND r.supplier_account_id=? AND o.team_id=? AND l.ingredient_code=? AND r.stage<>'Closed'`,buyerId,supplierId,supplierId,ingredient);
  for(const row of quotes){const quote=parse(row.record)?.quote;if(!quote||!Number.isFinite(quote.price)||quote.price<=0||!Number.isFinite(quote.moq)||quote.moq<=0||!/^[A-Z]{3}$/.test(quote.currency)||typeof quote.unit!=='string'||!quote.valid||!(Date.parse(quote.valid+'T23:59:59Z')>at))continue;
   offered.push(await asset('price',{kind:'existing_shared_quote',id:row.id,version:row.version},row.product+' · '+row.supplier_lot_id,{price:quote.price,currency:quote.currency,unit:quote.unit,moq:quote.moq,validThrough:quote.valid,verification:'Supplier quote already shared with this brand. No price calculation.'}));
  }
 }
 // Distinct records retain their exact scope; no union of grants or guessed values.
 return [...new Map(offered.map(item=>[item.id,item])).values()];
}
