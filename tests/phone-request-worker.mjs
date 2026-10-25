import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Miniflare} from 'miniflare';
const calls=[];
const mf=new Miniflare({modulesRoot:resolve('dist/server'),modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...readdirSync('dist/server',{recursive:true}).filter(f=>typeof f==='string'&&/\.m?js$/.test(f)&&f!=='index.js').map(f=>({type:'ESModule',path:resolve('dist/server',f)}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{VLE_TECRID_RECEIVER_ENABLED:'false'},outboundService:async request=>{calls.push(request.url);return new Response(null,{status:503});}});
try{
 const db=await mf.getD1Database('DB');
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
 const base='https://vle.test';
 for(const path of ['/requests','/requests/new','/requests/11111111-1111-4111-8111-111111111111']){const response=await mf.dispatchFetch(base+path);assert.equal(response.status,200,path);const html=await response.text();assert(html.includes('noindex,nofollow'));assert(!html.includes('assetRefs'));}
 assert.equal((await mf.dispatchFetch(base+'/requests/not-a-request')).status,404);
 for(const path of ['/api/requests','/api/requests/catalog','/api/requests/waiting','/api/requests/11111111-1111-4111-8111-111111111111','/api/requests/11111111-1111-4111-8111-111111111111/on-file']){
  const response=await mf.dispatchFetch(base+path);assert.equal(response.status,401,path);assert(response.headers.get('cache-control').includes('no-store'));assert(!JSON.stringify(await response.json()).includes('assetRefs'));
 }
 for(const path of ['/api/requests','/api/requests/catalog/review','/api/requests/on-file/review','/api/requests/11111111-1111-4111-8111-111111111111/answer']){
  const response=await mf.dispatchFetch(base+path,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'{}'});assert.equal(response.status,401,path);
 }
 assert.deepEqual(calls,[]);console.log('PASS: compiled Worker deep links serve a private noindex shell, invalid routes return404, and dispatch rejects all anonymous request/catalog/record routes and mutations, private responses are no-store, receiver remains OFF and zero outbound calls.');
}finally{await mf.dispose();}
