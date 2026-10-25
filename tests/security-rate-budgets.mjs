import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {takeBudget} from '../server/abuse-budget.js';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-22'}),db=await mf.getD1Database('DB');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const s of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(s.trim())await db.prepare(s).run();
test.after(async()=>mf.dispose());
test('concurrent budgets admit only the configured count, independent of request IP',async()=>{const at=Date.now(),r=await Promise.all(Array.from({length:8},()=>takeBudget(db,'recipient','private@security.test',3,900000,at)));assert.equal(r.filter(Boolean).length,3);assert.equal(await takeBudget(db,'recipient','other@security.test',3,900000,at),true);assert.equal(await takeBudget(db,'recipient','private@security.test',3,900000,at+900001),true);const rows=await db.prepare('SELECT key FROM auth_rate_limit').all();assert(rows.results.every(row=>!row.key.includes('@')&&!row.key.includes('private')));});
