// Presentation of the existing public projection only. No reads or access decisions.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const programLabel=program=>program==='analytical-record'?'Lab result, not a certification':program||'Program not stated';
export const certificationAnchor=id=>'proof-cert-'+encodeURIComponent(id||'record');
export function tecridStatus(record){
 const status=String(record.status||'pending').toLowerCase();
 // An active credential does not establish a qualification decision.
 return status==='qualified'?'QUALIFIED':status;
}
function publicTecridUrl(value){
 try{const url=new URL(value);return url.origin==='https://tecrid.com'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export function lastTestedDate(values=[]){
 return values.filter(value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value.slice(0,10)).map(value=>value.slice(0,10)).sort().at(-1)||null;
}
const formatDate=value=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(value));
function tecridChip(record){
 const status=tecridStatus(record),url=publicTecridUrl(record.verificationUrl);
 const details=[record.freshness,record.program&&programLabel(record.program),record.issuingLab].filter(Boolean).join(' · ');
 const text=`<span class="proof-chip-id">${esc(record.tecrid)}</span><span class="proof-chip-status">${esc(status)}${record.freshness==='lapsed'?' · lapsed':''}</span>`;
 const attributes=`class="proof-chip tecrid-chip${status==='QUALIFIED'?' is-qualified':''}" aria-label="${esc([record.tecrid,status,details].filter(Boolean).join(' · '))}" title="${esc(details)}"`;
 return url?`<a ${attributes} href="${esc(url)}" target="_blank" rel="noopener noreferrer">${text}<span aria-hidden="true">↗</span></a>`:`<span ${attributes}>${text}<span>Public link unavailable</span></span>`;
}
function certificationChip(certification,href){
 const c=certification,status=c.status==='unknown'||!c.status?'Unverified':c.status;
 const description=[programLabel(c.program||c.title),status,c.scope,c.verification].filter(Boolean).join(' · ');
 const text=`${esc(programLabel(c.program||c.title))}<span class="proof-chip-status">${esc(status)}</span>`;
 const attributes=`class="proof-chip certification-chip" title="${esc(description)}" aria-label="${esc(description)}"`;
 return href?`<a ${attributes} href="${esc(href+'#'+certificationAnchor(c.id))}" data-nav>${text}</a>`:`<span ${attributes}>${text}</span>`;
}
export function proofStrip(wall={},options={}){
 const tecrids=wall?.tecrids||[],certs=wall?.certifications||[];
 const tested=lastTestedDate([options.lastTested,wall?.lastTested]);
 return `<div class="proof-strip" aria-label="${esc(options.label||'Proof summary')}">
 <div class="proof-chips" aria-label="TECRIDs">${tecrids.length?tecrids.map(tecridChip).join(''):'<span class="proof-empty-note">No TECRID yet</span>'}</div>
 ${tecrids.some(t=>t.program==='analytical-record')?'<p class="proof-scope-note">Lab result, not a certification</p>':''}
 ${certs.length?`<div class="proof-chips" aria-label="Certifications">${certs.map(c=>certificationChip(c,options.certificationHref)).join('')}</div>${certs.some(c=>c.verification!=='verified against registry')?'<p class="proof-scope-note">Supplier-reported. Current status not verified.</p>':''}`:''}
 <p class="proof-tested">Last tested: ${tested?`<time datetime="${tested}">${formatDate(tested)}</time>`:'Not provided'}</p>
 </div>`;
}
export function organizationRoles(roles=[]){
 const names={supplier:'Supplier',brand:'Brand',private_label_manufacturer:'Private-label manufacturer',retailer:'Retailer',certification_body:'Certification body'};
 return `<div class="proof-roles" aria-label="Organization roles">${roles.map(role=>`<span>${esc(names[role]||role)}</span>`).join('')}</div>`;
}
