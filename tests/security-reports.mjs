import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {kasReports,reportBytes} from '../server/kasandrinos.js';
import {routeFixture} from './support/route-fixture.mjs';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});
const db=await mf.getD1Database('DB');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const s of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(s.trim())await db.prepare(s).run();
let reads=0;
const fixture={env:{DB:db,BUCKET:{async get(){reads++;return {body:new TextEncoder().encode('%PDF-synthetic')};}}},user:null};
const {GET}=await routeFixture(fixture);
test.after(async()=>mf.dispose());
for(const report of kasReports.filter(r=>r.group==='analysis')) {
 test(`unapproved verified buyer cannot read controlled report ${report.id}`,async()=>{
  fixture.user={userId:'synthetic-buyer',email:'buyer@organization.test',displayName:'Synthetic buyer'};
  const before=reads,r=await GET(new Request('https://vle.test/api/reports/kasandrinos/'+report.id));
  assert.equal(r.status,403);assert.equal(reads,before,'Storage must not be read before authorization');
 });
}
test('anonymous report request is denied before reading private storage',async()=>{fixture.user=null;const before=reads;assert.equal((await GET(new Request('https://vle.test/api/reports/kasandrinos/'+kasReports[0].id))).status,401);assert.equal(reads,before);});
test('the source manifest publishes no original report location',()=>{assert(kasReports.every(r=>!('sourceURL' in r)),'Original locations must be absent from the tracked manifest');});
test('missing private storage never falls back to an external source',async()=>{let network=0;await assert.rejects(reportBytes({id:'synthetic',sourceURL:'https://source.test/private.pdf',sha256:'a'.repeat(64),bytes:1},{get:async()=>null},async()=>{network++;return new Response('x');}));assert.equal(network,0,'No source fetch is allowed');});
