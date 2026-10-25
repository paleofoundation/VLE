// Loopback-only SYNTHETIC verification harness. Never imported by the deployed Worker.
// Auth identity is a local fixture; membership, request APIs and disposable D1/R2 are real.
import {createServer} from 'node:http';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {Miniflare} from 'miniflare';
import {phoneRequest} from '../server/phone-requests.js';
import {sourcingRequest} from '../server/sourcing-api.js';
import {initial,allLots} from '../server/fixtures.js';
import {kasCatalog} from '../server/kasandrinos.js';
import {storefrontDefaults} from '../server/storefront.js';
const port=Number(process.env.PORT||5194),origin='http://127.0.0.1:'+port;
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("synthetic")}}',d1Databases:['DB'],r2Buckets:['BUCKET'],compatibilityDate:'2026-05-15'});
const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('BUCKET');
for(const file of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
const users={brand:{userId:'qa-brand',email:'brand@example.invalid'},supplier:{userId:'qa-supplier',email:'supplier@example.invalid'},otherSupplier:{userId:'qa-other-supplier',email:'other-supplier@example.invalid'},operator:{userId:'qa-operator',email:'operator@example.invalid'}};
const teams={brand:'qa-brand-team',supplier:'qa-supplier-team',otherSupplier:'qa-other-supplier-team',operator:'qa-operator-team'};
for(const [role,user] of Object.entries(users)){
 await db.prepare('INSERT INTO auth_user (id,name,email,email_verified,created_at,updated_at) VALUES (?,?,?,1,0,0)').bind(user.userId,'SYNTHETIC '+role,user.email).run();
 await db.prepare('INSERT INTO team_accounts (id,name,kind,owner_email,contact_email,created_at) VALUES (?,?,?,?,?,?)').bind(teams[role],'SYNTHETIC '+(role==='otherSupplier'?'second supplier':role),['supplier','otherSupplier'].includes(role)?'supplier':'buyer',user.email,user.email,new Date().toISOString()).run();
 await db.prepare('INSERT INTO team_selections (user_id,team_id) VALUES (?,?)').bind(user.userId,teams[role]).run();
 const state={...initial(),role:role==='brand'?'brand':'supplier',supplierProfile:{id:'account-'+teams[role],name:'SYNTHETIC '+role,category:'SYNTHETIC ingredient',initials:'EX'}};
 await db.prepare('INSERT INTO review_sessions (user_id,state,version) VALUES (?,?,0)').bind(teams[role],JSON.stringify(state)).run();
 await db.prepare('INSERT INTO proof_organizations (id,team_id,slug,name) VALUES (?,?,?,?)').bind(teams[role],teams[role],teams[role],'SYNTHETIC '+role).run();
 if(['supplier','otherSupplier'].includes(role))await db.prepare('INSERT INTO proof_lots (id,supplier_id,supplier_lot_id,ingredient_code,product_sku,product) VALUES (?,?,?,?,?,?)').bind('qa-lot-'+role,teams[role],'SYNTHETIC-LOT-'+role,'synthetic-ingredient','SYNTHETIC-SKU','SYNTHETIC product').run();
}
const call=async(role,path,body)=>{
 const response=await phoneRequest(new Request(origin+path,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({accountId:teams[role],...body})}),db,bucket,users[role],{owner:role==='operator',buyer:false});const result=await response.json();if(!response.ok)throw Error(JSON.stringify(result));return result;
};
for(const role of ['supplier','otherSupplier'])await call('operator','/api/requests/catalog/review',{supplierId:teams[role],ingredientCode:'synthetic-ingredient',ingredientLabel:'SYNTHETIC ingredient',status:'verified',version:0,reviewReference:'Synthetic identity and ingredient review for local verification only',expiresAt:new Date(Date.now()+30*86400000).toISOString()});
const bytes=new TextEncoder().encode('%PDF-SYNTHETIC source fixture, no real report');await bucket.put('qa-source.pdf',bytes);
await db.prepare('INSERT INTO supplier_submissions (id,owner_id,body,file_key,status,created_at) VALUES (?,?,?,?,?,?)').bind('qa-submission',teams.supplier,JSON.stringify({product:'SYNTHETIC product',lot:'SYNTHETIC-LOT-supplier',category:'SYNTHETIC ingredient'}),'qa-source.pdf','Reviewed',new Date().toISOString()).run();
const digest=await crypto.subtle.digest('SHA-256',bytes),sourceHash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
for(const kind of ['spec','coa'])await call('operator','/api/requests/on-file/review',{submissionId:'qa-submission',sourceHash,version:0,product:'SYNTHETIC product',lot:'SYNTHETIC-LOT-supplier',ingredientCode:'synthetic-ingredient',kind,reviewReference:'Synthetic source-bound extraction review for local verification only',fields:[{name:'Packaging',value:'SYNTHETIC filed specification'}],results:[{analyte:'SYNTHETIC metric',resultText:'SYNTHETIC reported value',unit:'example unit'}]});
const pendingId='11111111-1111-4111-8111-111111111111';
async function reset(){
 await db.batch([db.prepare('DELETE FROM phone_request_recipients'),db.prepare('DELETE FROM phone_requests'),db.prepare("DELETE FROM proof_audit WHERE id LIKE 'phone-create:%' OR id LIKE 'phone-answer:%' OR id LIKE 'phone-read:%'"),db.prepare("DELETE FROM sourcing_notifications WHERE id LIKE 'phone-request:%'")]);
 await call('brand','/api/requests',{id:pendingId,ingredientCode:'synthetic-ingredient',items:['coa','spec'],targetMode:'one',targets:[teams.supplier]});
}
await reset();
const root=resolve('public'),shell=JSON.parse(readFileSync('server/shell.ts','utf8').match(/export const shell=("[\s\S]*");/)[1]);
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,origin),role=req.headers.cookie?.includes('qa-role=supplier')?'supplier':'brand';
 const send=async response=>{res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));};
 const json=data=>send(Response.json(data));
 if(url.pathname==='/__qa/role'){const selected=url.searchParams.get('role')==='supplier'?'supplier':'brand';await reset();res.setHeader('Set-Cookie','qa-role='+selected+'; Path=/; SameSite=Strict');res.writeHead(302,{Location:selected==='supplier'?'/workspace':'/brand'});res.end();return;}
 if(url.pathname==='/__qa/checks')return json({requests:(await db.prepare('SELECT COUNT(*) AS n FROM phone_requests').first()).n,answers:(await db.prepare("SELECT COUNT(*) AS n FROM phone_request_recipients WHERE status='answered'").first()).n,notifications:(await db.prepare("SELECT COUNT(*) AS n FROM sourcing_notifications WHERE delivery='pending'").first()).n});
 const team={id:teams[role],name:'SYNTHETIC '+role,kind:role==='brand'?'buyer':'supplier',role:'owner'};
 if(url.pathname==='/api/bootstrap'){
  const state={...initial(),role,supplier:'account-'+team.id,supplierProfile:role==='supplier'?{id:'account-'+team.id,name:team.name,category:'SYNTHETIC ingredient',initials:'EX'}:undefined};
  return json({proof:{organizations:[],lots:[]},state,version:0,lots:allLots(),kasandrinos:{...kasCatalog(),storefront:storefrontDefaults},session:{signedIn:true,email:users[role].email,team,canBuy:role==='brand',canViewEvidence:false,canManageStorefront:false,pilotController:false}});
 }
 if(url.pathname==='/api/evidence-notifications')return json({items:[],unreadCount:0});
 if(url.pathname.startsWith('/api/requests')||url.pathname.startsWith('/api/sourcing')){
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>100000)throw Error('Fixture request too large');chunks.push(chunk);}
  const request=new Request(url.href,{method:req.method,headers:req.headers,...(req.method==='GET'?{}:{body:Buffer.concat(chunks)})});
  const handler=url.pathname.startsWith('/api/requests')?phoneRequest:sourcingRequest;
  return send(await handler(request,db,bucket,users[role],{owner:false,buyer:false}));
 }
 if(url.pathname.startsWith('/api/'))return send(new Response('Not found',{status:404}));
 const file=resolve(root,'.'+decodeURIComponent(url.pathname));let exists=false;try{exists=statSync(file).isFile();}catch{/* Static fallback. */}
 if(file.startsWith(root+sep)&&exists){res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.webmanifest':'application/manifest+json'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(shell.replace('<body>','<body><div style="padding:7px 18px;background:#fff3c4;font:12px sans-serif">SYNTHETIC LOCAL PREVIEW · no real records or messages</div>'));
 }catch{res.writeHead(503);res.end('Synthetic preview unavailable');}});
server.listen(port,'127.0.0.1',()=>console.log('Synthetic P2 browser → real scoped API → disposable D1/R2: '+origin));
async function close(){server.close();await mf.dispose();process.exit(0);}process.on('SIGINT',close);process.on('SIGTERM',close);
