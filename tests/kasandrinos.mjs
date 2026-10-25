import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {kasReports,kasLots,kasCatalog,reportBytes} from '../server/kasandrinos.js';
import {allLots,initial,ensureDeal,retireCatalogExamples,suppliers} from '../server/fixtures.js';
assert.equal(kasReports.length,16);assert.equal(kasLots.length,6);
assert.equal(kasReports.filter(r=>r.group==='analysis').length,11);
assert.equal(kasReports.filter(r=>r.lotNumbers.length).length,9);
const expected={'195 K/B':['ll-43300','ll-43299'],'227 K/B':['ll-43301','ll-43295','ll-43296','athens-12-4338'],'228 K/B':['ll-43298','ll-43302','ll-43297','athens-12-4338'],'219 K/B':['athens-12-4338'],'225 K/B':['athens-12-4338'],'226 K/B':['athens-12-4338']};
for(const lot of kasLots){assert.deepEqual(lot.reports,expected[lot.lotNumber]);assert(lot.coa&&lot.matched&&!lot.confirmed);assert(!('values'in lot));assert(!('price'in lot));assert.equal(lot.availability,'Not confirmed');for(const id of lot.reports)assert(kasReports.find(r=>r.id===id).lotNumbers.includes(lot.lotNumber));}
assert.equal(kasReports.find(r=>r.id==='athens-12-4338').scope,'shared-sample');
assert.equal(kasReports.find(r=>r.id==='athens-12-4338').matchPage,2);
assert.deepEqual(kasReports.find(r=>r.id==='woc-c2526-00228').lotNumbers,[]);
assert.deepEqual(kasReports.find(r=>r.id==='envirolabs-5-92-24').lotNumbers,[]);
assert(kasReports.find(r=>r.id==='paleo-keto-archive').note.includes('not presented as a current certification'));
assert(kasReports.find(r=>r.id==='organic-spices').note.includes('Not evidence for olive oil'));
const catalog=JSON.stringify(kasCatalog());for(const field of ['sourceURL','sha256','bytes','file','Concentration','LOQ'])assert(!catalog.includes('"'+field+'"'));
assert(allLots(initial()).some(l=>l.id==='KAS-227-KB'));const state=initial();state.role='brand';assert.throws(()=>ensureDeal(state,'KAS-227-KB','test'),/onboarding/);
// A public catalog must not inherit demo lots or publish stale review drafts.
assert.deepEqual(suppliers.map(s=>s.id),['kasandrinos']);
assert.equal(allLots(initial()).length,6);
const stale={...initial(),supplier:'aegean',supplierProfile:{id:'account-private',name:'Private company'},requests:[{id:'EXAMPLE-REQ-01',brand:'example-foods',responses:['EXAMPLE-DEAL-01']},{id:'private-request',brand:'workspace-brand',responses:['EXAMPLE-DEAL-01']}],deals:[{id:'EXAMPLE-DEAL-01',supplier:'aegean',lot:'EXAMPLE-OLIVE-01'}],views:[{supplier:'aegean',lot:'EXAMPLE-OLIVE-01'}],draft:{published:true,id:'EXAMPLE-OLIVE-02',coa:true,confirmed:true,values:[1,2,3,4]}};
assert(allLots(stale).every(l=>l.real&&l.supplier==='kasandrinos'&&!l.id.startsWith('EXAMPLE-')));
retireCatalogExamples(stale);assert.equal(stale.deals.length,0);assert.equal(stale.views.length,0);assert(!stale.draft.published);assert.deepEqual(stale.draft.values,[]);assert.equal(stale.requests.length,1);assert.deepEqual(stale.requests[0].responses,[]);assert.equal(stale.supplierProfile.name,'Private company');assert.equal(stale.supplier,'kasandrinos');
// Full original bytes from private storage only; changed objects fail closed.
const data=Buffer.from('%PDF-1.7\nlocal fixture\n%%EOF'),report={id:'test',bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};
const bucket={async get(key){assert(key.includes(report.sha256));return {arrayBuffer:async()=>data};}};
assert.equal(Buffer.from(await reportBytes(report,bucket)).compare(data),0);
await assert.rejects(reportBytes({...report,sha256:'0'.repeat(64)},{get:async()=>({arrayBuffer:async()=>data})}),/changed/);
await assert.rejects(reportBytes({...report,bytes:1},bucket),/changed/);
await assert.rejects(reportBytes(report,null),/unavailable/);
await assert.rejects(reportBytes(report,{get:async()=>null}),/unavailable/);
console.log('PASS: catalog provenance and scope; no invented values; controller-only private PDF storage and integrity.');
