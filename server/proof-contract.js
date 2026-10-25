// Provisional marketplace contract. Step 1 notification envelopes are not evidence.
const encoder = new TextEncoder();
export class ProofError extends Error {
 constructor(message, status=400) { super(message); this.status=status; }
}
export const required = (value, name, max=200) => {
 if (typeof value!=='string' || !value.trim() || value.length>max || /[\u0000-\u001f]/.test(value)) throw new ProofError(`Invalid ${name}.`);
 return value.trim();
};
export const identifier = (value, name='identifier') => {
 const text=required(value,name,120);
 if (text!==value || !/^[A-Za-z0-9][A-Za-z0-9._:·-]*$/.test(text)) throw new ProofError(`Invalid ${name}.`);
 return text;
};
export function dateValue(value, name, optional=false) {
 if (optional && value==null) return null;
 const text=required(value,name,40);
 if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(text) || !Number.isFinite(Date.parse(text))) throw new ProofError(`Invalid ${name}.`);
 return new Date(text).toISOString();
}
export const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
export async function verifyDelivery(request, secret, now=Date.now()) {
 if (typeof secret!=='string' || secret.length<32) throw new ProofError('Evidence receiver is not configured.',503);
 if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ProofError('JSON required.',415);
 // Bound the byte stream before allocating/parsing an untrusted body.
 const reader=request.body?.getReader();if(!reader)throw new ProofError('Body required.');
 const chunks=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw new ProofError('Payload too large.',413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 const match=/^t=(\d{10}),v1=([a-f0-9]{64})$/.exec(request.headers.get('X-TECRID-Signature')||'');
 if(!match || Math.abs(now/1000-Number(match[1]))>300) throw new ProofError('Invalid or expired delivery signature.',401);
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const signature=Uint8Array.from(match[2].match(/../g),x=>parseInt(x,16));
 if(!await crypto.subtle.verify('HMAC',key,signature,encoder.encode(`${match[1]}.${body}`))) throw new ProofError('Invalid delivery signature.',401);
 let data;try{data=JSON.parse(body);}catch{throw new ProofError('Invalid JSON.');}
 if(request.headers.get('X-TECRID-Event-Id')!==data.eventId) throw new ProofError('Event identity mismatch.');
 return {data,bodyHash:await digest(body)};
}
export function validateEnvelope(data, recipient, now=Date.now()) {
 if(!data||typeof data!=='object'||Array.isArray(data))throw new ProofError('Evidence object required.',422);
 if(data.schemaVersion!=='vle-evidence/1' || data.environment!=='production') throw new ProofError('Unsupported evidence contract or environment.',422);
 if(!['upsert','tombstone'].includes(data.operation)||!/^[a-f0-9]{64}$/.test(data.streamId))throw new ProofError('Native ordered evidence stream required.',422);
 if(!['credential.issued','credential.corrected','credential.revoked','grant.revoked'].includes(data.event)) throw new ProofError('Unsupported evidence event.',422);
 identifier(data.deliveryId,'delivery ID');identifier(data.eventId,'event ID');
 if(!Number.isSafeInteger(data.sequence)||data.sequence<1)throw new ProofError('Invalid event sequence.');
 const occurred=dateValue(data.occurredAt,'event time');if(Date.parse(occurred)>now+300000)throw new ProofError('Future event time.');
 if(!recipient || data.recipient?.type!=='marketplace' || data.recipient.organizationId!==recipient) throw new ProofError('Wrong marketplace recipient.',403);
 const c=data.credential,g=data.grant;
 if(!c || !g || data.operation==='upsert'&&(c.verification?.signatureVerified!==true || c.verification?.fingerprintVerified!==true || c.verification?.currentVersion!==true)) throw new ProofError('Authenticated current evidence required.',422);
 identifier(c.tecrid,'TECRID');
 if(/^(SBX|TEST)[·:._-]/i.test(c.tecrid))throw new ProofError('Sandbox evidence cannot become production proof.',422);
 if(!Number.isSafeInteger(c.version)||c.version<1 || !/^[a-f0-9]{64}$/.test(c.fingerprint))throw new ProofError('Invalid credential version or fingerprint.');
 if(!['active','revoked','superseded'].includes(c.status))throw new ProofError('Invalid credential status.');
 if(data.event==='credential.revoked' && c.status!=='revoked')throw new ProofError('Revocation must revoke the credential.');
 required(c.program,'program');required(c.issuingLab,'issuing laboratory');
 if(c.program!=='analytical-record')throw new ProofError('A separately verified certification contract is required for a certification program.',422);
 dateValue(c.issuedAt,'issued date');dateValue(c.retestDue,'retest due',true);
 const url=new URL(c.verificationUrl);
 if(url.origin!=='https://tecrid.com'||!url.pathname.startsWith('/records/')||url.username||url.password||url.search||url.hash||decodeURIComponent(url.pathname.slice(9))!==c.tecrid)throw new ProofError('Invalid public verification URL.');
 const identity=c.identity;
 if(!identity)throw new ProofError('Signed lot identity required.');
 identifier(identity.originatingSupplierId,'originating supplier');
 identifier(identity.originatingSupplier,'TECRID supplier');identifier(identity.mappingId,'reviewed supplier mapping');
 if(!identity.lotId&&!identity.supplierLotId&&!identity.ingredientCode&&!identity.productSku)throw new ProofError('Signed lot identity required.');
 for(const k of ['ingredientCode','productSku','supplierLotId'])if(identity[k]!=null)required(identity[k],k);
 if(identity.lotId!=null)identifier(identity.lotId,'lot ID');
 identifier(g.id,'grant ID');
 identifier(g.controllerOrganizationId,'controlling organization');
 if(g.supersedesGrantId!=null){identifier(g.supersedesGrantId,'superseded grant');if(g.supersedesGrantId===g.id)throw new ProofError('A grant cannot replace itself.');}
 if(g.recipientOrganizationId!==recipient || !['active','revoked'].includes(g.status) || !['status_only','selected_analytes','full_record'].includes(g.accessLevel)||typeof g.publicStatus!=='boolean')throw new ProofError('Invalid marketplace grant.',403);
 if(data.event==='grant.revoked'&&g.status!=='revoked')throw new ProofError('Revocation must revoke the grant.');
 dateValue(g.expiresAt,'grant expiry',true);
 if(!Array.isArray(g.brandOrganizationIds)||g.brandOrganizationIds.length>100)throw new ProofError('Explicit downstream grant scope required.');
 g.brandOrganizationIds.forEach(x=>identifier(x,'brand organization'));
 if(data.operation==='tombstone'){
  if(!['credential.revoked','grant.revoked'].includes(data.event)||g.status!=='revoked'||g.publicStatus||g.brandOrganizationIds.length||Object.hasOwn(data,'snapshot')||Object.hasOwn(data,'snapshotFingerprint'))throw new ProofError('A withdrawal must be metadata only and remove disclosure.',422);
  required(data.reason,'withdrawal reason');if(!/^[a-z][a-z0-9_]{1,100}$/.test(data.reason))throw new ProofError('A metadata-only withdrawal reason code is required.',422);
  const metadataOnly=value=>{if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(['results','snapshot','snapshotJson','snapshotFingerprint','canonicalPayload','signedPayload'].includes(key))throw new ProofError('A withdrawal cannot contain a result payload.',422);metadataOnly(item);}};metadataOnly(data);
 }else{
  if(!['credential.issued','credential.corrected'].includes(data.event)||g.status!=='active'||c.status!=='active'||g.expiresAt&&Date.parse(g.expiresAt)<=now)throw new ProofError('Current active evidence and grant required.',422);
  if(!data.snapshot||typeof data.snapshot!=='object'||data.snapshot.tecrid!==c.tecrid||data.snapshot.version!==c.version||!/^[a-f0-9]{64}$/.test(data.snapshotFingerprint))throw new ProofError('Scoped snapshot identity required.',422);
  if(!Array.isArray(data.snapshot.results)||data.snapshot.results.length>100||data.snapshot.resultsAccess?.accessLevel!==g.accessLevel)throw new ProofError('Snapshot scope mismatch.',422);
  if(g.accessLevel==='status_only'&&data.snapshot.results.length)throw new ProofError('Status-only evidence must withhold findings.',422);
  if(g.accessLevel==='selected_analytes'){
   const allowed=data.snapshot.resultsAccess.analytes;if(!Array.isArray(allowed)||data.snapshot.results.some(r=>typeof r.analyte!=='string'||!allowed.some(a=>typeof a==='string'&&a.toLowerCase()===r.analyte.toLowerCase())))throw new ProofError('Analytes exceed the approved snapshot scope.',422);
  }
  if(g.accessLevel!=='full_record'){
   const inspect=value=>{if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(['canonicalPayload','signedPayload'].includes(key)&&item!=null)throw new ProofError('Full signed content exceeds the approved scope.',422);inspect(item);}};inspect(data.snapshot);
  }
 }
 return data;
}
export function freshness(due, now=Date.now()) {
 if(!due)return 'not stated';
 const days=(Date.parse(due)-now)/86400000;
 return days<0?'lapsed':days<=30?'due':'current';
}
