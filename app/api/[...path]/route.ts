import {reportPermission} from '../../../server/kasandrinos-report-permissions.js';
import {teamRequest,canEditKas,selectedTeam} from '../../../server/teams.js';
import {sourcingRequest} from '../../../server/sourcing-api.js';
import {storefrontRequest} from '../../../server/storefront-api';
import {storefrontRecord,publicStorefront,canManageStorefront} from '../../../server/storefront.js';
import { env } from 'cloudflare:workers';
import { getEmailUser, emailAuth } from '../../../server/email-auth';
import {permissions,privateHeaders,failure} from '../../../server/access';
import {initial,retireCatalogExamples,allLots,supplierFor,canSeeDeal,openCOA,ensureDeal,addEvent,transition,analytes,categories,brand,now} from '../../../server/fixtures';
import {pdf} from '../../../server/pdf';
import {kasCatalog,kasReports,kasLots,reportBytes} from '../../../server/kasandrinos';
export const dynamic='force-dynamic';
function database(){if(!env.DB)throw Error('Database unavailable.');return env.DB;}
const json=(value:any,status=200)=>Response.json(value,{status,headers:privateHeaders});
async function context(request:Request){
 const user=await getEmailUser(request), p=permissions(user);
 const activeTeam=await selectedTeam(database(),user);if(activeTeam?.kind==='buyer')p.buyer=true;
 if(!user)return {user,p,state:initial(),version:0};
 const seed=initial();seed.role=p.buyer?'brand':'member';
 await database().prepare('INSERT OR IGNORE INTO review_sessions (user_id,state,version) VALUES (?,?,0)').bind(user.userId,JSON.stringify(seed)).run();
 const row=await database().prepare('SELECT state,version FROM review_sessions WHERE user_id=?').bind(user.userId).first<any>();
 const state=retireCatalogExamples(JSON.parse(row.state));
 // A verified email owns only its own supplier profile. It never claims a fixture supplier.
 const ownSupplier=state.supplierProfile?.id==='account-'+user.userId;
 if(!p.owner){
  state.role=state.role==='supplier'&&ownSupplier?'supplier':p.buyer?'brand':'member';
  state.supplier=ownSupplier?state.supplierProfile.id:'account-'+user.userId;
 }
 if(!ownSupplier)delete state.supplierProfile;
 return {user,p,state,version:row.version};
}
async function projection(c:any){
 const {user,p,state,version}=c;
 const team=await selectedTeam(database(),user);
 if(team){state.role=team.kind==='supplier'?'supplier':'brand';if(team.kind==='supplier'){const teamState=await database().prepare('SELECT state FROM review_sessions WHERE user_id=?').bind(team.id).first<any>();state.supplierProfile=teamState?JSON.parse(teamState.state).supplierProfile:{id:'account-'+team.id,name:team.name,category:'Olive oil',initials:team.name.slice(0,2),person:user.displayName};state.supplier=state.supplierProfile.id;}}
 const signed=!!user && state.role!=='out', buyer=p.buyer&&state.role==='brand';
 const supplier=state.role==='supplier'&&(p.owner||state.supplierProfile?.id==='account-'+user?.userId);
 const supplierInfo=state.supplierProfile?.id===state.supplier?state.supplierProfile:supplierFor(state.supplier);
 const result=structuredClone(state);
 result.role=!user?'out':state.role;
 result.deals=(buyer||supplier)?state.deals.filter((d:any)=>canSeeDeal(state,d)):[];
 result.requests=buyer?state.requests:supplier?state.requests.filter((r:any)=>r.category===supplierInfo.category):[];
 result.views=[];
 if(supplier){
  const records=await database().prepare('SELECT email,name,company,lot,supplier,viewed_at FROM evidence_views WHERE supplier=? ORDER BY viewed_at DESC LIMIT 30').bind(state.supplier).all<any>();
  result.views=state.views.filter((v:any)=>v.supplier===state.supplier).concat(records.results.reverse().map((v:any)=>({brand:v.company,company:v.company,person:v.name,email:v.email,lot:v.lot,supplier:v.supplier,time:v.viewed_at,realView:true})));
 }
 // Unconfirmed draft data never goes to buyers, other suppliers, or anonymous requests.
 result.draft={coa:false,confirmed:false,published:false,values:[]};
 result.kasDraftHtml=null;
 if(!buyer)for(const d of result.deals){if(d.test)delete d.test.values;}
 const lots=allLots().map((l:any)=>{
  const {values,price,moq,lead,...metadata}=l;
  return {...metadata,...(signed?{price,moq,lead}:{}),...(buyer&&!l.real?{values}:{})};
 });
 const sf=await storefrontRecord(database());
 const kas={...kasCatalog(),storefront:publicStorefront(sf)};
 const testReportAccess:Record<string,any>={};
 if(user)for(const report of kas.reports.filter((r:any)=>r.tecridTest))testReportAccess[report.id]=await reportPermission(database(),user,report.reportNumber);
 return {state:result,lots,kasandrinos:kas,version,session:{signedIn:!!user,email:user?.email||null,name:user?.displayName||null,companyEmail:p.companyEmail,canReview:p.owner,canManageStorefront:canManageStorefront(user,p.owner,sf)||await canEditKas(database(),user),supplierConnected:true,pilotController:user?.email?.toLowerCase()==='karen@paleofoundation.com',team,canBuy:p.buyer,hasSupplierWorkspace:!!state.supplierProfile,canViewEvidence:buyer,testReportAccess,signIn:'/email-sign-in'}};
}
async function save(c:any){
 const r=await database().prepare('UPDATE review_sessions SET state=?,version=version+1 WHERE user_id=? AND version=?').bind(JSON.stringify(c.state),c.user.userId,c.version).run();
 if(r.meta.changes!==1)throw Error('Another tab updated this demo. Reload the page and try again.');
 c.version++;
}
async function logView(c:any,l:any){
 await database().prepare('INSERT INTO evidence_views (id,user_id,email,name,company,lot,supplier,viewed_at) VALUES (?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,c.user.email,c.user.displayName,c.p.company,l.id,l.supplier,new Date().toISOString()).run();
}
export async function GET(request:Request){
 try{
  const path=new URL(request.url).pathname;
  if(path==='/api/team'){return teamRequest(request,database(),await getEmailUser(request));}
  if(path.startsWith('/api/sourcing')){const user=await getEmailUser(request);return sourcingRequest(request,database(),(env as any).BUCKET,user,permissions(user));}
  if(path.startsWith('/api/auth/'))return authRequest(request);
  if(path==='/api/storefront'||/^\/api\/storefront-assets\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(path)){const user=await getEmailUser(request);return await storefrontRequest(request,database(),(env as any).BUCKET,user,permissions(user));}
  if(path!=='/api/bootstrap'&&!/^\/api\/(coa|evidence)\/(KAS-\d+-KB)$/.test(path)&&!/^\/api\/reports\/kasandrinos\/[a-z0-9-]+$/.test(path))return failure('Not found',404);
  const c=await context(request);
  if(path==='/api/bootstrap')return json(await projection(c));
  if(!c.user)return failure('Sign in to request or view this evidence.',401);
  if(path.startsWith('/api/reports/kasandrinos/')){
   const report=kasReports.find(r=>r.id===path.split('/').at(-1));
   if(!report)return failure('Report not found',404);
   return serveKasReport(c,report);
  }
  if(!c.p.buyer||c.state.role!=='brand')return failure('Full COAs and lab values are restricted to signed-in brand buyers.',403);
  const lot:any=allLots().find((l:any)=>l.id===path.split('/').at(-1));
  if(!lot)return failure('Lot not found',404);
  if(path.startsWith('/api/evidence/'))return json(lot.real?{id:lot.id,status:'Awaiting supplier confirmation',values:[],analytes:[]}:{id:lot.id,values:lot.values,analytes:lot.analytes,basis:lot.basis});
  if(lot.real)return serveKasReport(c,kasReports.find(r=>r.id===lot.primaryReport));
  await logView(c,lot);
  return new Response(pdf(lot),{headers:{...privateHeaders,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${lot.id}-COA-EXAMPLE.pdf"`}});
 }catch(error){console.error('VLE request failed',error);return failure('This request could not be completed. Please try again.',503);}
}
export async function POST(request:Request){
 try{
  if(new URL(request.url).pathname==='/api/team'){return teamRequest(request,database(),await getEmailUser(request));}
  if(new URL(request.url).pathname.startsWith('/api/sourcing')){const user=await getEmailUser(request);return sourcingRequest(request,database(),(env as any).BUCKET,user,permissions(user));}
  if(new URL(request.url).pathname.startsWith('/api/auth/'))return authRequest(request);
  if(['/api/storefront','/api/storefront/upload'].includes(new URL(request.url).pathname)){const user=await getEmailUser(request);return await storefrontRequest(request,database(),(env as any).BUCKET,user,permissions(user));}
  if(new URL(request.url).pathname!=='/api/action')return failure('Not found',404);
  if(request.headers.get('origin')!==new URL(request.url).origin)return failure('Same-origin request required.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return failure('JSON required',415);
  const raw=await request.text();if(raw.length>20000)return failure('Request too large',413);
  const {action,data={},version}=JSON.parse(raw),c=await context(request);
  if(!c.user)return failure('Sign in to continue.',401);
  if(version!==c.version)return failure('This demo changed in another tab. Reload and try again.',409);
  if(['inquiry','post-request','respond-request','close-request','transition','attachment','load-coa','confirm-values'].includes(action))return failure('Use the sourcing workspace for this action.',410);
  const s=c.state;
  const buyerPermission=()=>{if(!c.p.buyer)throw Error('Use your company email for brand-buyer access.');};
  const buyer=()=>{buyerPermission();if(s.role!=='brand')throw Error('Open your brand workspace first.');};
  const reviewer=()=>{if(!c.p.owner)throw Error('Only the site owner can use supplier review accounts.');};
  const supplier=()=>{throw Error('Supplier document uploads are not connected yet.');};
  if(action==='role'){reviewer();if(!['out','brand','supplier'].includes(data.role))throw Error('Invalid view.');s.role=data.role;}
  else if(action==='supplier'){reviewer();if(!supplierFor(data.supplier))throw Error('Unknown supplier.');s.supplier=data.supplier;}
  else if(action==='supplier-profile'){
   const name=String(data.name||'').trim(),category=String(data.category||'');
   if(name.length<2||name.length>120||!categories.includes(category))throw Error('Enter your company name and choose an ingredient category.');
   s.supplierProfile={id:'account-'+c.user.userId,name,category,initials:name.split(/\s+/).slice(0,2).map((w:string)=>w[0]).join('').toUpperCase(),person:c.user.displayName};
   s.supplier=s.supplierProfile.id;s.role='supplier';
  }
  else if(action==='workspace'){
   if(data.role==='brand'){buyerPermission();s.role='brand';}
   else if(data.role==='supplier'&&s.supplierProfile?.id==='account-'+c.user.userId){s.supplier=s.supplierProfile.id;s.role='supplier';}
   else throw Error('Set up your own supplier workspace first.');
  }
  else if(action==='reset'){const profile=s.supplierProfile;c.state=initial();c.state.supplierProfile=profile;c.state.role=c.p.buyer?'brand':profile?'supplier':'member';if(profile)c.state.supplier=profile.id;}
  else if(action==='limits'){buyer();if(!Array.isArray(data.limits)||data.limits.length!==4||data.limits.some((v:any)=>!Number.isFinite(v)||v<0))throw Error('Enter four valid limits.');s.limits=data.limits;}
  else if(action==='coa'){buyer();openCOA(s,data.lot);await logView(c,allLots().find((l:any)=>l.id===data.lot));}
  else if(action==='inquiry'){buyer();const d=ensureDeal(s,data.lot,'Brand started an EXAMPLE inquiry.');addEvent(d,'brand','message',String(data.message||'').slice(0,1500));}
  else if(action==='post-request'){buyer();if(!data.category||!data.unit||!(Number(data.quantity)>0))throw Error('Complete the Request fields.');s.requests.push({id:'EXAMPLE-REQ-'+String(s.next++).padStart(2,'0'),brand:brand.id,category:String(data.category),ingredient:String(data.ingredient).slice(0,200),quantity:Number(data.quantity),unit:String(data.unit),date:String(data.date),destination:String(data.destination).slice(0,200),use:String(data.use).slice(0,400),needs:String(data.needs).slice(0,1500),limits:analytes.map((_:any,i:number)=>Number(data['limit'+i])),status:'Open',responses:[],created:now()});}
  else if(action==='respond-request'){reviewer();if(s.role!=='supplier')throw Error('Supplier view required.');const d=ensureDeal(s,data.lot,'Supplier responded to the EXAMPLE Request.',data.id);addEvent(d,'supplier','message',String(data.message||'').slice(0,1500));}
  else if(action==='close-request'){buyer();const r=s.requests.find((x:any)=>x.id===data.id&&x.brand===brand.id);if(!r)throw Error('Request not found.');r.status='Closed';}
  else if(action==='transition'){if(s.role==='brand')buyer();else reviewer();transition(s,data.id,data.step,data.values||{});}
  else if(action==='attachment'){if(s.role==='brand')buyer();else reviewer();const d=s.deals.find((x:any)=>x.id===data.id);if(!canSeeDeal(s,d))throw Error('This room is not yours.');if(!['Product-specification-EXAMPLE.txt','Packing-slip-EXAMPLE.txt'].includes(data.name))throw Error('Use an EXAMPLE attachment.');addEvent(d,s.role,'attachment','Attached a demonstration document.',{file:data.name});}
  else if(action==='load-coa'){supplier();s.draft.coa=true;}
  else if(action==='confirm-values'){supplier();if(!s.draft.coa||data.lot!==s.draft.id||!Array.isArray(data.confirmed)||!data.confirmed.every((v:any)=>v===true)||data.confirmed.length!==4||!Array.isArray(data.values)||data.values.length!==4||data.values.some((v:any)=>!Number.isFinite(v)||v<0))throw Error('Match the lot and confirm all four valid values.');s.draft.values=data.values;s.draft.confirmed=true;s.draft.published=true;}
  else return failure('Unknown action',400);
  await save(c);return json(await projection(c));
 }catch(error){return failure(error instanceof Error?error.message:'Request failed',400);}
}

async function authRequest(request:Request){
 const path=new URL(request.url).pathname;
 const allowed=request.method==='GET'?['/api/auth/magic-link/verify']:['/api/auth/sign-in/magic-link','/api/auth/sign-out'];
 if(!allowed.includes(path))return failure('Not found',404);
 if(request.method==='POST'&&request.headers.get('origin')!==new URL(request.url).origin)return failure('Same-origin request required.',403);
 try{
  const result=await emailAuth().handler(request);
  const headers=new Headers(result.headers);for(const [k,v] of Object.entries(privateHeaders))headers.set(k,v);
  headers.set('Referrer-Policy','no-referrer');
  return new Response(result.body,{status:result.status,headers});
 }catch{return failure('We could not send your sign-in link. Please try again shortly.',503);}
}

async function serveKasReport(c:any,report:any){
 try{
  if(kasCatalog().reports.find((r:any)=>r.id===report.id)?.tecridTest){
   if(!(await reportPermission(database(),c.user,report.reportNumber)).canReadPdf)return failure('Original PDFs are private source evidence. Request the digital TECRID card on TECRID.',403);
  }else if(!c.p.buyer||c.state.role!=='brand')return failure('Brand-buyer permission required.',403);
  const bytes=await reportBytes(report,(env as any).BUCKET);
  await logView(c,{id:report.lotNumbers.length?report.lotNumbers.join(', ')+' · '+report.reportNumber:'Supplier reference · '+report.reportNumber,supplier:'kasandrinos'});
  return new Response(bytes,{headers:{...privateHeaders,'Content-Type':'application/pdf','Content-Disposition':`inline; filename="Kasandrinos-${report.id}.pdf"`,'X-Report-SHA256':report.sha256}});
 }catch(error){console.error('Kasandrinos report unavailable',report.id,error instanceof Error?error.message:'Unknown source error');return failure('This source report is unavailable or changed. Please try again after it has been reviewed.',503);}
}
