import {ProofError,digest,dateValue} from './proof-contract.js';
const rows=async(db,query,...args)=>(await db.prepare(query).bind(...args).all()).results;

export async function acceptEvidenceStream(data,bodyHash,db,now){
 const c=data.credential,g=data.grant,i=c.identity;
 if(data.streamId!==await digest(JSON.stringify([c.tecrid,data.recipient.organizationId])))throw new ProofError('Credential and recipient stream identity mismatch.',422);
 if(data.operation==='upsert'&&await digest(JSON.stringify(data.snapshot))!==data.snapshotFingerprint)throw new ProofError('Snapshot fingerprint mismatch.',422);
 const seen=await db.prepare('SELECT * FROM proof_delivery_receipts WHERE delivery_id=? OR event_id=? OR (stream_id=? AND sequence=?)').bind(data.deliveryId,data.eventId,data.streamId,data.sequence).first();
 if(seen){if(seen.delivery_id!==data.deliveryId||seen.event_id!==data.eventId||seen.body_hash!==bodyHash)throw new ProofError('Delivery or stream sequence reused with different content.',409);return {accepted:true,duplicate:true,receivedAt:seen.received_at};}
 let candidates=await rows(db,'SELECT * FROM proof_lots WHERE supplier_id=?',i.originatingSupplierId);
 if(i.lotId)candidates=candidates.filter(l=>l.id===i.lotId);
 if(i.supplierLotId)candidates=candidates.filter(l=>l.supplier_lot_id===i.supplierLotId);
 if(i.ingredientCode||i.productSku)candidates=candidates.filter(l=>i.ingredientCode?l.ingredient_code===i.ingredientCode:l.product_sku===i.productSku);
 if(candidates.length!==1)throw new ProofError('Lot identity is unmatched or ambiguous; no proof attached.',422);
 const lot=candidates[0],receivedAt=new Date(now).toISOString(),recipient=data.recipient.organizationId;
 const valid=`NOT EXISTS(SELECT 1 FROM proof_stream_state s WHERE s.stream_id=? AND (s.lot_id<>? OR s.originating_supplier<>? OR s.mapping_id<>? OR (?='upsert' AND ?>s.sequence AND (?<s.credential_version OR (?=s.credential_version AND ?<>s.credential_fingerprint) OR (s.credential_status='revoked' AND ?<=s.credential_version)))))
 AND NOT EXISTS(SELECT 1 FROM lot_tecrid_grants t WHERE t.tecrid=? AND t.recipient_id=? AND t.grant_id=? AND (t.lot_id<>? OR t.controller_id<>?))
 AND NOT EXISTS(SELECT 1 FROM lot_tecrid_grants t WHERE t.tecrid=? AND t.recipient_id=? AND t.grant_id=? AND t.controller_id<>?)
 AND (?<>'upsert' OR NOT EXISTS(SELECT 1 FROM lot_tecrid_grants t WHERE t.tecrid=? AND t.recipient_id=? AND t.supersedes_grant_id=?))`;
 const validity=[data.streamId,lot.id,i.originatingSupplier,i.mappingId,data.operation,data.sequence,c.version,c.version,c.fingerprint,c.version,c.tecrid,recipient,g.id,lot.id,g.controllerOrganizationId,c.tecrid,recipient,g.supersedesGrantId||'',g.controllerOrganizationId,data.operation,c.tecrid,recipient,g.id];
 const applied=`EXISTS(SELECT 1 FROM proof_stream_state WHERE stream_id=? AND event_id=?)`;
 const snapshot=data.operation==='upsert'?JSON.stringify(data.snapshot):null,privateHash=data.operation==='upsert'?data.snapshotFingerprint:null;
 const commands=[
  db.prepare(`INSERT INTO proof_delivery_receipts(delivery_id,event_id,body_hash,lot_id,tecrid,sequence,received_at,stream_id) SELECT ?,?,?,?,?,?,?,? WHERE ${valid}`).bind(data.deliveryId,data.eventId,bodyHash,lot.id,c.tecrid,data.sequence,receivedAt,data.streamId,...validity),
  db.prepare(`INSERT INTO proof_stream_state(stream_id,recipient_id,tecrid,lot_id,originating_supplier,mapping_id,sequence,credential_version,credential_fingerprint,credential_status,event_id,updated_at)
  SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM proof_delivery_receipts WHERE delivery_id=? AND body_hash=?)
  ON CONFLICT(stream_id) DO UPDATE SET sequence=excluded.sequence,credential_version=MAX(proof_stream_state.credential_version,excluded.credential_version),
  credential_fingerprint=CASE WHEN excluded.credential_version>=proof_stream_state.credential_version THEN excluded.credential_fingerprint ELSE proof_stream_state.credential_fingerprint END,
  credential_status=CASE WHEN proof_stream_state.credential_status='revoked' AND excluded.credential_version<=proof_stream_state.credential_version THEN 'revoked' WHEN excluded.credential_status='revoked' THEN 'revoked' WHEN excluded.credential_version>=proof_stream_state.credential_version THEN excluded.credential_status ELSE proof_stream_state.credential_status END,
  event_id=excluded.event_id,updated_at=excluded.updated_at WHERE excluded.sequence>proof_stream_state.sequence`).bind(data.streamId,recipient,c.tecrid,lot.id,i.originatingSupplier,i.mappingId,data.sequence,c.version,c.fingerprint,c.status,data.eventId,receivedAt,data.deliveryId,bodyHash),
  db.prepare(`INSERT INTO lot_tecrid_grants(tecrid,grant_id,recipient_id,controller_id,stream_id,lot_id,version,sequence,status,program,issuing_lab,issued_at,retest_due,verification_url,fingerprint,grant_status,access_level,public_status,grant_expires_at,brand_ids,supersedes_grant_id,snapshot_json,snapshot_fingerprint,received_at)
  SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${applied}
  ON CONFLICT(tecrid,recipient_id,grant_id) DO UPDATE SET version=excluded.version,sequence=excluded.sequence,status=excluded.status,program=excluded.program,issuing_lab=excluded.issuing_lab,issued_at=excluded.issued_at,retest_due=excluded.retest_due,verification_url=excluded.verification_url,fingerprint=excluded.fingerprint,grant_status=excluded.grant_status,access_level=excluded.access_level,public_status=excluded.public_status,grant_expires_at=excluded.grant_expires_at,brand_ids=excluded.brand_ids,supersedes_grant_id=excluded.supersedes_grant_id,snapshot_json=excluded.snapshot_json,snapshot_fingerprint=excluded.snapshot_fingerprint,received_at=excluded.received_at WHERE excluded.sequence>lot_tecrid_grants.sequence`).bind(c.tecrid,g.id,recipient,g.controllerOrganizationId,data.streamId,lot.id,c.version,data.sequence,c.status,c.program,c.issuingLab,dateValue(c.issuedAt,'issued date'),dateValue(c.retestDue,'retest due',true),c.verificationUrl,c.fingerprint,g.status,g.accessLevel,g.publicStatus?1:0,dateValue(g.expiresAt,'grant expiry',true),JSON.stringify(g.brandOrganizationIds),g.supersedesGrantId||null,snapshot,privateHash,receivedAt,data.streamId,data.eventId),
 ];
 if(g.supersedesGrantId)commands.push(db.prepare(`UPDATE lot_tecrid_grants SET snapshot_json=NULL,snapshot_fingerprint=NULL,grant_status='revoked',public_status=0,brand_ids='[]',sequence=? WHERE stream_id=? AND grant_id=? AND controller_id=? AND ${applied}`).bind(data.sequence,data.streamId,g.supersedesGrantId,g.controllerOrganizationId,data.streamId,data.eventId));
 if(data.event==='credential.revoked')commands.push(db.prepare(`UPDATE lot_tecrid_grants SET snapshot_json=NULL,snapshot_fingerprint=NULL,status='revoked',grant_status='revoked',public_status=0,brand_ids='[]' WHERE stream_id=? AND ${applied}`).bind(data.streamId,data.streamId,data.eventId));
 try{await db.batch(commands);}catch(error){
  const race=await db.prepare('SELECT * FROM proof_delivery_receipts WHERE delivery_id=? OR event_id=? OR (stream_id=? AND sequence=?)').bind(data.deliveryId,data.eventId,data.streamId,data.sequence).first();
  if(race?.delivery_id===data.deliveryId&&race.event_id===data.eventId&&race.body_hash===bodyHash)return {accepted:true,duplicate:true,receivedAt:race.received_at};
  if(race)throw new ProofError('Delivery or stream sequence reused with different content.',409);throw error;
 }
 const receipt=await db.prepare('SELECT 1 FROM proof_delivery_receipts WHERE delivery_id=? AND body_hash=?').bind(data.deliveryId,bodyHash).first();
 if(!receipt)throw new ProofError('Stream identity, current version, controller or replacement state changed.',409);
 const final=await db.prepare('SELECT event_id FROM proof_stream_state WHERE stream_id=?').bind(data.streamId).first();
 return {accepted:true,duplicate:false,stale:final?.event_id!==data.eventId,receivedAt};
}
