import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {takeBudget,guardMutationRequest} from '../server/abuse-budget.js';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-22'}),db=await mf.getD1Database('DB');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const s of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(s.trim())await db.prepare(s).run();
test.after(async()=>mf.dispose());
test('concurrent budgets admit only the configured count, independent of request IP',async()=>{const at=Date.now(),r=await Promise.all(Array.from({length:8},()=>takeBudget(db,'recipient','private@security.test',3,900000,at)));assert.equal(r.filter(Boolean).length,3);assert.equal(await takeBudget(db,'recipient','other@security.test',3,900000,at),true);assert.equal(await takeBudget(db,'recipient','private@security.test',3,900000,at+900001),true);const rows=await db.prepare('SELECT key FROM auth_rate_limit').all();assert(rows.results.every(row=>!row.key.includes('@')&&!row.key.includes('private')));});

test.beforeEach(async () => {
 await db.prepare("DELETE FROM auth_rate_limit WHERE key LIKE 'tecrid-budget:%'").run();
});
const mutation = (ip, cookie) => new Request('https://vle.test/api/auth/sign-in/magic-link', {
 method: 'POST', headers: {'cf-connecting-ip': ip, ...(cookie ? {cookie} : {})},
});
async function budgetCount(scope, principal) {
 const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scope+'\n'+principal))), b=>b.toString(16).padStart(2,'0')).join('');
 return (await db.prepare('SELECT count FROM auth_rate_limit WHERE key=?').bind('tecrid-budget:'+digest).first())?.count ?? 0;
}

test('a flooding client cannot spend the global budget on rejected mutations or block another sign-in', async () => {
 const env = {DB: db, TECRID_API_IP_LIMIT: 2, TECRID_API_GLOBAL_LIMIT: 50};
 const flood = await Promise.all(Array.from({length: 80}, (_, i) => guardMutationRequest(mutation('192.0.2.1', 'synthetic='+i), env)));
 assert.equal(flood.filter(r => r instanceof Request).length, 2);
 assert.equal(flood.filter(r => r instanceof Response && r.status === 429).length, 78);
 assert.ok(await guardMutationRequest(mutation('192.0.2.2'), env) instanceof Request);
 assert.equal(await budgetCount('api-global', 'application'), 3);
});

test('a low configured global limit retains headroom above one client allowance', async () => {
 const env = {DB: db, TECRID_API_IP_LIMIT: 2, TECRID_API_GLOBAL_LIMIT: 1};
 assert.ok(await guardMutationRequest(mutation('192.0.2.1'), env) instanceof Request);
 assert.ok(await guardMutationRequest(mutation('192.0.2.1'), env) instanceof Request);
 assert.equal((await guardMutationRequest(mutation('192.0.2.1'), env)).status, 429);
 assert.ok(await guardMutationRequest(mutation('192.0.2.2'), env) instanceof Request);
});

test('principal rejections do not consume the global budget across changing IPs', async () => {
 const env = {DB: db, TECRID_API_IP_LIMIT: 2, TECRID_API_PRINCIPAL_LIMIT: 2, TECRID_API_GLOBAL_LIMIT: 50};
 for (const ip of ['192.0.2.1', '192.0.2.2']) assert.ok(await guardMutationRequest(mutation(ip, 'synthetic=shared'), env) instanceof Request);
 const flood = await Promise.all(Array.from({length: 60}, (_, i) => guardMutationRequest(mutation('198.51.100.'+(i+1), 'synthetic=shared'), env)));
 assert.ok(flood.every(r => r instanceof Response && r.status === 429));
 assert.equal(await budgetCount('api-global', 'application'), 2);
 assert.ok(await guardMutationRequest(mutation('203.0.113.1', 'synthetic=other'), env) instanceof Request);
});

test('the global ceiling still rejects aggregate traffic from many clients', async () => {
 const env = {DB: db, TECRID_API_IP_LIMIT: 1, TECRID_API_GLOBAL_LIMIT: 25};
 const results = await Promise.all(Array.from({length: 26}, (_, i) => guardMutationRequest(mutation('192.0.2.'+(i+1)), env)));
 assert.equal(results.filter(r => r instanceof Request).length, 25);
 assert.equal(results.filter(r => r instanceof Response && r.status === 429).length, 1);
 const rejected = results.find(r => r instanceof Response);
 assert.equal(rejected.headers.get('Cache-Control'), 'private, no-store');
 assert.equal(rejected.headers.get('Retry-After'), '60');
});
