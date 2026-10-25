import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Miniflare} from 'miniflare';
const calls=[];
const mf=new Miniflare({modulesRoot:resolve('dist/server'),modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...readdirSync('dist/server',{recursive:true}).filter(f=>typeof f==='string'&&/\.m?js$/.test(f)&&f!=='index.js').map(f=>({type:'ESModule',path:resolve('dist/server',f)}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],assets:{directory:resolve('dist/client'),routerConfig:{has_user_worker:true}} ,bindings:{VLE_TECRID_RECEIVER_ENABLED:'false'},outboundService:async request=>{calls.push(request.url);return new Response(null,{status:503});}});
try{
 for(const path of ['/','/about','/suppliers','/suppliers/kasandrinos','/lots/KAS-227-KB']){
  const r=await mf.dispatchFetch('https://vle.test'+path);assert.equal(r.status,200,path);const text=await r.text();const match=text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);assert(match,path);const graph=JSON.parse(match[1])['@graph'];assert.equal(graph.find(x=>x['@type']==='WebPage').url,'https://vle.exchange'+path);
 }
 for(const path of ['/requests','/brand','/workspace','/proof','/reports/ll-43301']){const r=await mf.dispatchFetch('https://vle.test'+path);assert.equal(r.status,200,path);const text=await r.text();assert(!text.includes('application/ld+json'));assert(text.includes('noindex,nofollow'));}
 const r=await mf.dispatchFetch('https://vle.test/llms.txt');assert.equal(r.status,200);assert((await r.text()).startsWith('# Verified Lot Exchange\n'));assert(readFileSync('dist/client/llms.txt','utf8').startsWith('# Verified Lot Exchange\n'));
 assert.equal((await mf.dispatchFetch('https://vle.test/missing-public-page')).status,404);assert.deepEqual(calls,[]);
 console.log('PASS: compiled Worker public home/supplier/lot JSON-LD, private pages excluded/noindex, actual text asset200, unknown404 and zero outbound calls.');
}finally{await mf.dispose();}
