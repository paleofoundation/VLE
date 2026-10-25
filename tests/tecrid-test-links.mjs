import assert from 'node:assert/strict';
import {kasCatalog,kasReports,tecridTestReference} from '../server/kasandrinos.js';
import {kasLotPage,kasTestOverview} from '../public/kasandrinos.js';
const catalog=kasCatalog(), linked=catalog.reports.filter(r=>r.tecridTest);
assert.equal(linked.length,8);assert.equal(new Set(linked.map(r=>r.tecridTest.testIdentifier)).size,8);
for(const report of linked){
 const test=report.tecridTest;assert(test.sandbox);assert.equal(test.productionAuthority,false);assert.equal(test.productionTecrid,null);
 assert.equal(new URL(test.resolverUrl).origin,'https://tecrid.com');assert.equal(decodeURIComponent(new URL(test.resolverUrl).pathname.split('/').at(-1)),test.testIdentifier);
 const source=kasReports.find(r=>r.id===report.id);assert.equal(tecridTestReference({...source,sha256:'wrong'}),null);assert.equal(tecridTestReference({...source,lotNumbers:['wrong']}),null);assert.equal(tecridTestReference({...source,lab:'Other lab'}),null);
}
for(const report of catalog.reports.filter(r=>r.lab!=='Light Labs'||r.scope!=='lot'))assert.equal(report.tecridTest,null);
for(const lot of catalog.lots){const html=kasLotPage(lot,catalog,{canViewEvidence:false});const refs=linked.filter(r=>lot.reports.includes(r.id));assert.equal((html.match(/TEST ID · SANDBOX/g)||[]).length,refs.length);for(const r of refs)assert(html.includes(r.tecridTest.resolverUrl));assert(!html.includes('data-action="kas-report"'));assert(!lot.confirmed);assert.deepEqual(lot.analytes,[]);}
assert.equal((kasTestOverview(catalog).match(/TEST ID · SANDBOX/g)||[]).length,8);
if(process.argv.includes('--live'))for(const r of linked){const response=await fetch(r.tecridTest.jsonUrl);assert(response.ok);const remote=await response.json();assert.equal(remote.testIdentifier,r.tecridTest.testIdentifier);assert.equal(remote.reportNumber,r.reportNumber);assert.equal(remote.lotNumber,r.lotNumbers[0]);assert.equal(remote.sourceSha256,kasReports.find(s=>s.id===r.id).sha256);assert.equal(remote.productionAuthority,false);assert.equal(remote.productionTecrid,null);console.log('Resolved test report',r.reportNumber);}
console.log('PASS: eight exact report/hash/lot matches; sandbox-only display; no unrelated links or PDF access changes.');
