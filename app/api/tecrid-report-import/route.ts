import {serviceAuthorized} from '../../../server/tecrid-service-auth.js';
import {env} from 'cloudflare:workers';
import {kasReports,reportBytes,tecridTestReference} from '../../../server/kasandrinos';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!await serviceAuthorized(request,env,'report-import'))return new Response(null,{status:401});
 if(!(env as any).BUCKET)return new Response(null,{status:503});
 const reports=kasReports.filter((r:any)=>tecridTestReference(r));
 const results=[];
 for(const report of reports){try{
  const body=await reportBytes(report,(env as any).BUCKET);
  const bytes=await new Response(body).arrayBuffer();
  const digest=Array.from(await hashBytes(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==report.sha256||bytes.byteLength!==report.bytes)throw Error('Fingerprint mismatch');
  results.push({reportNumber:report.reportNumber,status:'stored_private',sha256:digest});
 }catch{results.push({reportNumber:report.reportNumber,status:'failed'});}}
 return Response.json({sandbox:true,productionAuthority:false,reports:results},{status:results.every(r=>r.status==='stored_private')?200:503,headers:{'cache-control':'no-store'}});
}
async function hashBytes(bytes:ArrayBuffer){return new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));}
