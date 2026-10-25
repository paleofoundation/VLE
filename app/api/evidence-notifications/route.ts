import {env} from 'cloudflare:workers';
import {getEmailUser} from '../../../server/email-auth';
import {reportManagerRole} from '../../../server/kasandrinos-report-permissions.js';
import {evidenceNotifications,registryNotifications} from '../../../server/evidence-notifications.js';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
async function handle(request:Request){
 const user=await getEmailUser(request);if(!user)return json({error:'Sign in to view notifications.'},401);
 let id:string|undefined;
 if(request.method==='POST'){if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Same-origin request required.'},403);try{const text=await request.text();if(text.length>1000)return json({error:'Too large'},413);const body=JSON.parse(text);if(body.action!=='read'||typeof body.id!=='string'||body.id.length>240||!/^(vle|tecrid):/.test(body.id))throw Error();id=body.id;}catch{return json({error:'Invalid notification'},400);}}
 const role=await reportManagerRole(env.DB,user);
 const results=await Promise.allSettled([evidenceNotifications(env.DB,user,role,id?.startsWith('vle:')?id:undefined),registryNotifications(env,user,id?.startsWith('tecrid:')?id:undefined)]);
 if(id){const result=results[id.startsWith('vle:')?0:1];if(result.status==='rejected')return json({error:'Could not mark read. Retry.'},503);if(!Array.isArray(result.value)&&result.value.error)return json({error:result.value.error},result.value.status);}
 const items=results.flatMap(result=>result.status==='fulfilled'?(Array.isArray(result.value)?result.value:result.value.items||[]):[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 return json({items,unreadCount:items.filter(item=>!item.read).length,unavailable:results.flatMap((result,index)=>result.status==='rejected'?[index?'TECRID':'VLE']:[])});
}
export async function GET(request:Request){try{return await handle(request);}catch{return json({error:'Notifications unavailable'},503);}}
export async function POST(request:Request){try{return await handle(request);}catch{return json({error:'Notifications unavailable'},503);}}
