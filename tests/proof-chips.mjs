import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proofStrip,programLabel,tecridStatus,lastTestedDate} from '../public/proof-strip.js';
import {kasLotCard,kasSupplierPage,kasFeature,mobileProofStrip} from '../public/kasandrinos.js';
import {organizationPage,proofWall} from '../public/proof.js';
import {sourcingPage,invalidateSourcing} from '../public/sourcing.js';
import {tabsFor} from '../public/mobile-shell.js';
import {kasCatalog,kasLots} from '../server/kasandrinos.js';
import {storefrontDefaults} from '../server/storefront.js';
import {initial,allLots} from '../server/fixtures.js';
let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;};
const seed=JSON.parse(readFileSync('docs/verification/app-shell-1/public-proof-fixture.json'));
const catalog={...kasCatalog(),proof:seed.organizations[0],lotProofs:seed.lots,storefront:storefrontDefaults};
const record={tecrid:'SYNTHETIC·RECORD',verificationUrl:'https://tecrid.com/records/SYNTHETIC-RECORD',program:'analytical-record',status:'qualified',issuedAt:'2026-10-25T00:00:00Z'};
for(const status of ['qualified','QUALIFIED','pending','active','expired','revoked','suspended','superseded',undefined]){
 const html=proofStrip({tecrids:[{...record,status}]});
 const label=status?.toLowerCase()==='qualified'?'QUALIFIED':status||'pending';
 check(html.includes('SYNTHETIC·RECORD'),`ID visible for ${status}`);
 check(html.includes(`<span class="proof-chip-status">${label}</span>`),`Status visible for ${status}`);
 check(html.includes('href="https://tecrid.com/records/SYNTHETIC-RECORD"'),`Public link for ${status}`);
 check(html.includes('Lab result, not a certification'),`Neutral analytical label for ${status}`);
 check(!html.includes('No TECRID yet'),`No false empty state for ${status}`);
 if(label!=='QUALIFIED')check(!html.includes('is-qualified'),`No qualification inferred from ${status}`);
}
check(tecridStatus({status:'active'})==='active','Active is not a sourcing qualification');
check(programLabel('analytical-record')==='Lab result, not a certification','Exact neutral program label');
for(const status of ['active','unknown','expired','revoked','suspended']){
 const c={id:'SYNTHETIC-CERT',program:'SYNTHETIC program',status,scope:'This lot only',verification:'self-reported'};
 const html=proofStrip({certifications:[c]},{certificationHref:'/lots/SYNTHETIC'});
 check(html.includes('SYNTHETIC program'),'Certification program shown');
 check(html.includes(status==='unknown'?'Unverified':status),'Certification status shown');
 check(html.includes('This lot only'),'Certification scope available in accessible label');
 check(html.includes('/lots/SYNTHETIC#proof-cert-SYNTHETIC-CERT'),'Chip opens scoped proof detail');
 check(html.includes('No TECRID yet'),'Certificate does not imply a TECRID');
 check(html.includes('Supplier-reported. Current status not verified.'),'Self-report remains qualified');
}
const analyticalCert={id:'SYNTHETIC-LAB',program:'analytical-record',title:'Misleading title',status:'active'};
for(const html of [proofStrip({certifications:[analyticalCert]}),proofWall({certifications:[analyticalCert],tecrids:[]})]){
 check(html.includes('Lab result, not a certification'),'Analytical program never displayed as certification title');
 check(!html.includes('Misleading title'),'No misleading certificate title');
}
const verified=proofStrip({certifications:[{program:'SYNTHETIC program',status:'active',verification:'verified against registry'}]});
check(!verified.includes('Current status not verified'),'Verified registry status preserved');
for(const wall of [undefined,null,{}, {tecrids:[],certifications:[]}]){
 const html=proofStrip(wall);
 check(html.includes('class="proof-empty-note">No TECRID yet</span>'),'Muted empty state, never blank');
 check(html.includes('Last tested: Not provided'),'Missing test date stays unknown');
}
check(proofStrip({tecrids:[record]}).includes('Last tested: Not provided'),'Issue date never substituted for test date');
check(lastTestedDate(['2026-02-30'])===null,'Invalid calendar dates stay unknown');
check(lastTestedDate(['2025-02-12','2026-01-29',null,'invalid'])==='2026-01-29','Latest provided test date');
check(proofStrip({}, {lastTested:'2026-01-29'}).includes('<time datetime="2026-01-29">Jan 29, 2026</time>'),'American English date');
for(const url of ['javascript:alert(1)','https://evil.test/records/x','https://tecrid.com.evil.test/x','https://tecrid.com:8443/records/x','http://tecrid.com/records/x','https://user:pass@tecrid.com/records/x']){
 const html=proofStrip({tecrids:[{...record,verificationUrl:url}]});
 check(!html.includes('href='),'Invalid public TECRID URL is not linked');
 check(html.includes('Public link unavailable'),'Invalid link has an honest fallback');
}
const hostile=proofStrip({tecrids:[{...record,tecrid:'<img src=x onerror=alert(1)>',status:'<script>',program:'<svg>'}],certifications:[{program:'<script>',scope:'" onclick="alert(1)'}]});
check(!/<img|<script|<svg/.test(hostile),'All record text escaped');
check(!hostile.includes('" onclick="'),'Attribute values escaped');
const lapsed=proofStrip({tecrids:[{...record,status:'active',freshness:'lapsed'}]});
check(lapsed.includes('active · lapsed'),'Lapsed freshness remains visible');
const testLot=mobileProofStrip(kasLots[0],catalog);
check(testLot.includes('No TECRID yet'),'TEST does not become production proof');
check(testLot.includes('pending · Sandbox'),'TEST status visibly pending and sandbox');
check(testLot.includes('Last tested:'),'Lot test date shown');
check(!testLot.includes('is-qualified'),'TEST cannot qualify a lot');
const noTestLot=mobileProofStrip(kasLots[3],catalog);
check(!noTestLot.includes('TEST TECRID'),'Shared-sample lot has no fabricated TEST link');
check(!noTestLot.includes('Organic spices'),'Organization-only certification never attaches to an oil lot');
for(const render of [()=>kasLotCard(kasLots[0],catalog),()=>kasFeature(catalog),()=>kasSupplierPage(catalog,{}),()=>organizationPage(catalog.proof,seed.organizations,kasLots)]){
 const html=render();check(html.includes('class="proof-strip"'),'Every card/profile includes shared proof strip');check(html.includes('No TECRID yet'),'Empty state survives integration');check(html.includes('Last tested:'),'Test date survives integration');
}
for(const html of [kasSupplierPage(catalog,{}),organizationPage(catalog.proof,seed.organizations,kasLots)]){
 for(const role of ['Supplier','Brand','Private-label manufacturer'])check(html.includes(`<span>${role}</span>`),`${role} displayed`);
 for(const c of catalog.proof.certifications)check(html.includes(c.program),'All five certification programs displayed');
}
const directoryCards=[...kasSupplierPage(catalog,{}).matchAll(/<article class="store-lot-listing"[\s\S]*?<\/article>/g)];
check(directoryCards.length===6&&directoryCards.every(c=>c[0].includes('No TECRID yet')&&c[0].includes('Last tested:')),'All six storefront lot directory cards have proof');
check(kasSupplierPage(catalog,{}).indexOf('Supplier proof')<kasSupplierPage(catalog,{}).indexOf('store-brand-banner'),'Storefront proof before imagery');
const brandPage=organizationPage({slug:'synthetic-brand',name:'SYNTHETIC brand',roles:['brand'],tecrids:[record],certifications:[analyticalCert],lots:[],releases:[]});
check(brandPage.indexOf('Organization proof')<brandPage.indexOf('Proof wall'),'Brand proof before detailed wall');
check(brandPage.includes('QUALIFIED'),'Brand uses its existing public qualification field');
check(brandPage.includes('Last tested: Not provided'),'Brand does not inherit an unrelated supplier test date');

// Render the actual app entrypoint, proving all route integration and role tabs together.
const root={innerHTML:''},saved=new Map();
const replace=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
replace('document',{body:{classList:{toggle(){}}},querySelector:s=>s==='#app'?root:{addEventListener(){}},addEventListener(){}});
replace('window',{addEventListener(){}});replace('localStorage',{removeItem(){}});replace('setInterval',()=>0);
replace('location',{pathname:'/',search:''});
let role='out';
replace('fetch',async path=>{if(path==='/api/sourcing')return {ok:true,json:async()=>({accountId:'synthetic',canBuy:true,isSupplier:true,briefs:[],rooms:[],opportunities:[],notifications:[],submissions:[]})};if(path==='/api/sourcing/waiting')return {ok:true,json:async()=>({accountId:'synthetic',tasks:[]})};assert.equal(path,'/api/bootstrap');return {ok:true,json:async()=>({state:{...initial(),role,supplier:'kasandrinos'},proof:seed,version:0,lots:allLots(),kasandrinos:catalog,session:{signedIn:role!=='out',email:null}})};});
try{
 for(const nextRole of ['out','brand','supplier','retailer','other']){
  role=nextRole;location.pathname='/';await import(`../public/app.js?proof-role=${role}`);await new Promise(setImmediate);
  const nav=root.innerHTML.match(/<nav class="phone-tabs"[\s\S]*?<\/nav>/)?.[0];
  check(Boolean(nav),'Phone tabs render beside proof');
  const labels=[...nav.matchAll(/<span>([^<]+)<\/span>/g)].map(m=>m[1]);
  assert.deepEqual(labels,tabsFor(role,role!=='out').map(t=>t.label));checks++;
  if(['brand','supplier'].includes(role)){check(root.innerHTML.includes('Waiting on you'),'Signed role home shows the scoped task inbox');check(!root.innerHTML.includes('data-explore-open'),'Role phone home removes the menu');continue;}
  check(root.innerHTML.includes('Supplier proof'),'Public home supplier card proof');
  const cards=[...root.innerHTML.matchAll(/<article class="lot-card[\s\S]*?<\/article>/g)];
  check(cards.length===6,'All six actual lot cards render');
  check(cards.every(c=>c[0].includes('No TECRID yet')&&c[0].includes('Last tested:')),'Every actual lot card has proof and date');
 }
 for(const path of ['/suppliers','/suppliers/kasandrinos','/organizations/kasandrinos','/lots/KAS-227-KB']){
  role=path==='/workspace'?'supplier':'out';location.pathname=path;await import(`../public/app.js?proof-route=${path}`);
  check(root.innerHTML.includes('class="proof-strip"'),`Proof integrated on ${path}`);
  check(!root.innerHTML.includes('We couldn’t load'),`Route remains functional: ${path}`);
 }
 // Sourcing candidates reuse public lot identity. Private submissions get the empty state.
 const source={canBuy:true,isSupplier:true,managerConnected:false,rooms:[],notifications:[],opportunities:[],submissions:[{id:'SYNTHETIC-SUBMISSION',status:'Reviewed',body:{product:'SYNTHETIC product',lot:'PRIVATE-LOT',company:'SYNTHETIC supplier',notes:''},review:''}],briefs:[{id:'SYNTHETIC-BRIEF',body:{limits:[null,null,null,null]},status:'Open',candidates:[{id:kasLots[0].id,supplier:'Kasandrinos',product:kasLots[0].product,packaging:kasLots[0].packaging,evidence:'Public catalog',gaps:[]}]}]};
 globalThis.fetch=async path=>{assert.equal(path,'/api/sourcing');return {ok:true,json:async()=>source};};
 invalidateSourcing();location.search='?id=SYNTHETIC-BRIEF';
 await new Promise(resolve=>sourcingPage('/sourcing',{signedIn:true},'brand',resolve,catalog));
 const candidate=sourcingPage('/sourcing',{signedIn:true},'brand',()=>{},catalog);
 check(candidate.includes('aria-label="Lot proof"'),'Sourcing candidate proof rendered');
 check(candidate.includes('No TECRID yet')&&candidate.includes('Jan 29, 2026'),'Candidate uses matching public lot metadata');
 location.search='';
 const submitted=sourcingPage('/workspace/documents',{signedIn:true},'supplier',()=>{},catalog);
 check(submitted.includes('aria-label="Submitted lot proof"'),'Submitted lot card has proof state');
 check(submitted.includes('No TECRID yet')&&submitted.includes('Last tested: Not provided'),'Review does not invent public proof or test date');
 invalidateSourcing();
}finally{for(const [key,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
console.log(`PASS: ${checks} proof chip/state, empty, scope/date, safe-link, profile/card integration and actual role-tab checks.`);
