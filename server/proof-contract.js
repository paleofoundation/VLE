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
 if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(text)) throw new ProofError(`Invalid ${name}.`);
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
 if(data.schemaVersion!=='vle-evidence/1' || data.environment!=='production') throw new ProofError('Unsupported evidence contract or environment.',422);
 if(!['credential.issued','credential.corrected','credential.revoked','grant.revoked'].includes(data.event)) throw new ProofError('Unsupported evidence event.',422);
 identifier(data.deliveryId,'delivery ID');identifier(data.eventId,'event ID');
 if(!Number.isSafeInteger(data.sequence)||data.sequence<1)throw new ProofError('Invalid event sequence.');
 const occurred=dateValue(data.occurredAt,'event time');if(Date.parse(occurred)>now+300000)throw new ProofError('Future event time.');
 if(!recipient || data.recipient?.type!=='marketplace' || data.recipient.organizationId!==recipient) throw new ProofError('Wrong marketplace recipient.',403);
 const c=data.credential,g=data.grant;
 if(!c || !g || c.verification?.signatureVerified!==true || c.verification?.fingerprintVerified!==true || c.verification?.currentVersion!==true) throw new ProofError('Authenticated current evidence required.',422);
 identifier(c.tecrid,'TECRID');
 if(!Number.isSafeInteger(c.version)||c.version<1 || !/^[a-f0-9]{64}$/.test(c.fingerprint))throw new ProofError('Invalid credential version or fingerprint.');
 if(!['active','revoked','superseded'].includes(c.status))throw new ProofError('Invalid credential status.');
 if(data.event==='credential.revoked' && c.status!=='revoked')throw new ProofError('Revocation must revoke the credential.');
 required(c.program,'program');required(c.issuingLab,'issuing laboratory');
 dateValue(c.issuedAt,'issued date');dateValue(c.retestDue,'retest due',true);
 const url=new URL(c.verificationUrl);
 if(url.origin!=='https://tecrid.com'||!url.pathname.startsWith('/records/')||url.username||url.password||url.search||url.hash||decodeURIComponent(url.pathname.slice(9))!==c.tecrid)throw new ProofError('Invalid public verification URL.');
 const identity=c.identity;
 if(!identity)throw new ProofError('Signed lot identity required.');
 identifier(identity.originatingSupplierId,'originating supplier');
 if(!identity.lotId&&!identity.supplierLotId&&!identity.ingredientCode&&!identity.productSku)throw new ProofError('Signed lot identity required.');
 for(const k of ['ingredientCode','productSku','supplierLotId'])if(identity[k]!=null)required(identity[k],k);
 if(identity.lotId!=null)identifier(identity.lotId,'lot ID');
 identifier(g.id,'grant ID');
 if(g.recipientOrganizationId!==recipient || !['active','revoked'].includes(g.status) || !['status_only','selected_analytes','full_record'].includes(g.accessLevel)||typeof g.publicStatus!=='boolean')throw new ProofError('Invalid marketplace grant.',403);
 if(data.event==='grant.revoked'&&g.status!=='revoked')throw new ProofError('Revocation must revoke the grant.');
 dateValue(g.expiresAt,'grant expiry',true);
 if(!Array.isArray(g.brandOrganizationIds)||g.brandOrganizationIds.length>100)throw new ProofError('Explicit downstream grant scope required.');
 g.brandOrganizationIds.forEach(x=>identifier(x,'brand organization'));
 return data;
}
export function freshness(due, now=Date.now()) {
 if(!due)return 'not stated';
 const days=(Date.parse(due)-now)/86400000;
 return days<0?'lapsed':days<=30?'due':'current';
}
