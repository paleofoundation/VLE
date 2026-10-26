import assert from 'node:assert/strict';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Miniflare} from 'miniflare';
const calls=[],rows=[];
const mf=new Miniflare({modulesRoot:resolve('dist/server'),modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...readdirSync('dist/server',{recursive:true}).filter(f=>typeof f==='string'&&/\.m?js$/.test(f)&&f!=='index.js').map(f=>({type:'ESModule',path:resolve('dist/server',f)}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],assets:{directory:resolve('dist/client'),routerConfig:{has_user_worker:true}},bindings:{VLE_TECRID_RECEIVER_ENABLED:'false'},outboundService:async request=>{calls.push(request.url);return new Response(null,{status:503});}});
async function probe(path,method='GET'){
 const r=await mf.dispatchFetch('https://vle.exchange'+path,{method,redirect:'manual'});const text=await r.text();
 const canonical=text.match(/rel="canonical" href="([^"]+)"/)?.[1]||null;
 const schemas=[...text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 rows.push({path,method,status:r.status,location:r.headers.get('location'),contentType:r.headers.get('content-type'),canonical,noindex:text.includes('noindex,nofollow'),schemaTypes:schemas.flatMap(s=>s['@graph'].map(n=>n['@type']))});return {r,text,canonical,schemas};
}
try{
 const home=await probe('/');assert.equal(home.r.status,200);assert.equal(home.canonical,'https://vle.exchange/');assert.deepEqual(home.schemas.flatMap(s=>s['@graph'].map(n=>n['@type'])),['Organization','WebSite']);
 for(const path of ['/about','/suppliers','/suppliers/kasandrinos','/lots/KAS-227-KB','/how-it-works','/resources','/faq','/privacy','/contact']){const p=await probe(path);assert.equal(p.r.status,200,path);assert.equal(p.canonical,'https://vle.exchange'+path);assert.equal(p.schemas.length,0);}
 for(const path of ['/requests','/requests/new','/brand','/workspace','/workspace/documents','/workspace/storefront','/proof','/reports/ll-43301','/team','/sourcing','/deals','/deals/room','/notifications','/email-sign-in','/design-system']){const p=await probe(path);assert.equal(p.r.status,200,path);assert.equal(p.schemas.length,0);assert(p.text.includes('noindex,nofollow'));}
 const mapping={'/for-buyers':'/how-it-works','/for-laboratories':'/resources','/access':'/','/join':'/'};
 for(const [source,destination] of Object.entries(mapping)){
  for(const suffix of ['','/','?source=old','/?source=old'])for(const method of ['GET','HEAD']){
   const {r,text}=await probe(source+suffix,method);assert.equal(r.status,301,source+suffix);assert.equal(r.headers.get('location'),'https://vle.exchange'+destination);assert.equal(text,'');
  }
  const p=await probe(destination);assert.equal(p.r.status,200);assert.equal(p.r.headers.get('location'),null);assert.equal(p.canonical,'https://vle.exchange'+destination);
 }
 for(const path of ['/missing-public-page','/for-buyers-extra','/access/private','/join/private','/api/health']){const p=await probe(path);assert.equal(p.r.status,404,path);assert.equal(p.r.headers.get('location'),null);}
 const guide=await probe('/llms.txt');assert.equal(guide.r.status,200);assert.match(guide.r.headers.get('content-type'),/^text\/plain/);assert.equal(guide.text,readFileSync('public/llms.txt','utf8'));assert.equal(guide.text,readFileSync('dist/client/llms.txt','utf8'));
 assert.doesNotMatch(guide.text,/kasandrinos|pilot|partners|[\u2013\u2014]/i);
 for(const m of guide.text.matchAll(/\]\(https:\/\/vle.exchange([^)]*)\)/g)){const p=await probe(m[1]||'/');assert.equal(p.r.status,200);assert.equal(p.canonical,'https://vle.exchange'+(m[1]||'/'));}
 const robots=await probe('/robots.txt');assert.equal(robots.r.status,200);assert.match(robots.text,/Allow: \/llms.txt/);
 for(const path of ['/api/','/team','/brand','/sourcing','/requests','/deals','/notifications','/workspace','/email-sign-in','/design-system'])assert(robots.text.includes('Disallow: '+path));
 const sitemap=await probe('/sitemap.xml');assert.equal(sitemap.r.status,200);for(const source of Object.keys(mapping))assert(!sitemap.text.includes('https://vle.exchange'+source+'<'));
 assert.deepEqual(calls,[]);writeFileSync('../evidence/vle-worker.json',JSON.stringify({rows,outbound:calls,receiver:'OFF'},null,2));
 console.log(`PASS ${rows.length} compiled Worker responses: all retired bare/slash/query/HEAD301 singlehop, destination200/selfcanonical, guideMIME/content/publiclinks, home identity only, private noindex, unknown404, robots policy and zero outbound.`);
}finally{await mf.dispose();}
