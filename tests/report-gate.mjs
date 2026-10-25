import assert from 'node:assert/strict';
import {reportGate,reportReturnPath} from '../public/report-gate.js';
import {kasCatalog} from '../server/kasandrinos.js';
const reports=kasCatalog().reports.filter(r=>r.tecridTest);assert.equal(reports.length,8);
for(const r of reports){const path='/reports/'+r.id;assert.equal(reportReturnPath(path),path);
 for(const session of [{},{signedIn:true},{signedIn:true,canViewEvidence:true}]){const page=reportGate(path,kasCatalog(),session);assert(!page.includes('/api/reports/'));assert(page.includes('TEST ID'));}
 const page=reportGate(path,kasCatalog(),{signedIn:true,canViewEvidence:true,testReportAccess:{[r.id]:{canReadPdf:true}}});assert(!page.includes('/api/reports/'));assert(page.includes('Open digital TECRID card'));assert(page.includes(r.tecridTest.resolverUrl));assert(page.includes(r.reportNumber));}
for(const bad of ['https://evil.test','//evil.test','/reports/ll-123','/api/reports/kasandrinos/ll-43301'])assert.equal(reportReturnPath(bad),null);
console.log('Eight report mappings, denied access and safe sign-in destinations passed');
