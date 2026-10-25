// Local synthetic screenshot fixture only. No real authentication, database or outbound requests.
// POST changes this process memory only; production handlers are tested separately.
import {createServer} from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {initial,allLots} from '../server/fixtures.js';
import {kasCatalog} from '../server/kasandrinos.js';
import {storefrontDefaults} from '../server/storefront.js';
const root=resolve('public');
const proof=JSON.parse(readFileSync('docs/verification/app-shell-1/public-proof-fixture.json','utf8'));
const shell=JSON.parse(readFileSync('server/shell.ts','utf8').match(/export const shell=("[\s\S]*");/)[1]);
const port=Number(process.env.PORT||5188);
const done=new Map();
createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),role=['brand','supplier','member'].find(r=>req.headers.cookie?.includes('qa-role='+r))||'out';
 res.setHeader('Cache-Control','no-store');
 const json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
 if(req.method==='POST'&&/^\/api\/sourcing\/waiting\/fixture-[a-z]+\/(approve|answer|not-now)$/.test(url.pathname)){let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);if(body.accountId!=='qa-'+role){res.writeHead(409);return json({error:'Synthetic account changed.'});}const id=url.pathname.split('/').at(-2);if(!done.has(role))done.set(role,new Set());done.get(role).add(id);return json({ok:true,decisionId:'synthetic-memory-only'});}
 if(req.method!=='GET'){res.writeHead(405);res.end('Read-only fixture');return;}
 if(url.pathname==='/__qa/role') {const r=url.searchParams.get('role');done.delete(r);res.setHeader('Set-Cookie','qa-role='+(['brand','supplier','member'].includes(r)?r:'out')+'; Path=/; SameSite=Strict');res.writeHead(302,{Location:'/'});res.end();return;}
 if(url.pathname==='/api/bootstrap'){
  const state={...initial(),role},signedIn=role!=='out';
  const team=signedIn?{id:'qa-'+role,name:'EXAMPLE '+role+' account',kind:role==='supplier'?'supplier':'buyer',role:'editor'}:null;
  if(role==='supplier'){state.supplier='qa-supplier';state.supplierProfile={id:'qa-supplier',name:team.name,category:'Olive oil',initials:'EX'};}
  return json({proof,state,version:0,lots:allLots(),kasandrinos:{...kasCatalog(),storefront:storefrontDefaults},session:{signedIn,email:signedIn?'fixture@example.invalid':null,team,canBuy:role==='brand',canViewEvidence:false,canManageStorefront:false,pilotController:false}});
 }
 if(url.pathname==='/api/sourcing/waiting')return json({accountId:'qa-'+role,readOnly:false,tasks:[role==='supplier'?{roomId:'fixture-hold',version:1,key:'hold:1',kind:'hold',title:'Approve this soft hold',detail:'80 kg through November 30. Contract and payment happen separately.',supplier:'EXAMPLE buyer conversation',lot:'SYNTHETIC-LOT'}:{roomId:'fixture-costs',version:1,key:'costs:1',kind:'costs',title:'Approve cost responsibility',detail:'The supplier proposed shipping and testing responsibility.',terms:{shipping:'Supplier arranges sample shipping',testing:'Brand arranges verification testing'},supplier:'EXAMPLE supplier',lot:'SYNTHETIC-LOT'}, {roomId:'fixture-answer',version:0,key:'answer:fixture-message',kind:'answer',title:'Answer your '+(role==='supplier'?'buyer':'supplier'),detail:'A message in this conversation is waiting for your answer.',supplier:'EXAMPLE '+(role==='supplier'?'buyer conversation':'supplier'),lot:'SYNTHETIC-LOT-2',message:'Could you confirm the delivery address for the sample?'}].filter(task=>!done.get(role)?.has(task.roomId))});
 if(url.pathname==='/api/sourcing')return json({accountId:'qa-'+role,team:{name:'EXAMPLE '+role+' account',role:'editor'},readOnly:false,isSupplier:role==='supplier',canBuy:role==='brand',briefs:[],rooms:[],opportunities:[],notifications:[],submissions:[],emailEnabled:false});
 if(url.pathname==='/api/evidence-notifications')return json({items:[],unreadCount:0});
 if(url.pathname.startsWith('/api/')){res.writeHead(404);res.end();return;}
 const file=resolve(root,'.'+decodeURIComponent(url.pathname));
 if(file.startsWith(root+sep)&&stat(file)) {res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.webmanifest':'application/manifest+json'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(shell);
}).listen(port,'127.0.0.1',()=>console.log('P1 synthetic fixture http://127.0.0.1:'+port));
function stat(path){try{return statSync(path).isFile();}catch{return false;}}
