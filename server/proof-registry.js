// Registry URLs are operator configuration, never supplier input. No HTML badge inference.
const origins={paleo:'https://paleofoundation.com',ics:'https://contaminantstandards.com'};
export async function verifyCertification(cert, organization, env, transport=fetch, now=Date.now()) {
 const printedExpired=!!cert.expires_at && Date.parse(cert.expires_at)<now;
 const base={...cert,status:printedExpired?'expired':cert.reported_status,verification:'self-reported, not verified',checkedAt:null,registryUrl:null};
 if(!cert.registry)return base;
 const configured=env[cert.registry==='paleo'?'VLE_PALEO_REGISTRY_URL':'VLE_ICS_REGISTRY_URL'];
 if(!configured)return {...base,verification:'self-reported, not verified; registry verification unavailable'};
 try {
  const url=new URL(configured);
  if(url.origin!==origins[cert.registry]||url.username||url.password)throw Error('Invalid registry origin');
  url.searchParams.set('certificateId',cert.registry_id);url.searchParams.set('organization',organization.slug);
  const response=await transport(url.href,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(4000)});
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Registry unavailable');
  const text=await response.text();if(text.length>32768)throw Error('Registry response too large');
  const r=JSON.parse(text).record;
  if(!r||r.id!==cert.registry_id||r.organizationSlug!==organization.slug||r.program!==cert.program||r.scope!==cert.scope||(r.lotId||null)!==(cert.lot_id||null)||!['active','expired','suspended','revoked'].includes(r.status))throw Error('Registry identity or scope mismatch');
  if(r.environment!=='production'||r.demo===true)throw Error('Production registry record required');
  const expires=r.expiresAt==null?null:Date.parse(r.expiresAt);if(expires!==null&&!Number.isFinite(expires))throw Error('Invalid registry expiry');
  return {...base,status:r.status==='active'&&(printedExpired||expires!==null&&expires<now)?'expired':r.status,verification:'verified against registry',checkedAt:new Date(now).toISOString(),registryUrl:origins[cert.registry]};
 }catch{return {...base,verification:'self-reported, not verified; registry verification unavailable'};}
}
