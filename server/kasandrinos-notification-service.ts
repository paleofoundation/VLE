import {serviceAuthorized} from './tecrid-service-auth.js';
import {deliverKasAccessNotifications,queueNotificationDeliveryTest} from './kasandrinos-request-notifications.js';
import {privateFetch} from './private-fetch.js';
export async function notificationService(request:Request,env:Record<string,any>,transport:typeof fetch=privateFetch){
 const headers={'Cache-Control':'private, no-store','Vary':'Authorization'};
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers});
 if(!await serviceAuthorized(request,env))return json({error:'Unauthorized'},401);
 let input;try{const text=await request.text();if(text.length>1000)return json({error:'Too large'},413);input=JSON.parse(text);}catch{return json({error:'Invalid request'},400);}
 if(!env.DB)return json({error:'Notification storage unavailable'},503);
 if(input.action!=='delivery-test')return json({error:'Unknown notification operation'},400);
 // Fixed recipient and content; no grant, requester identity or arbitrary email input.
 const notice=await queueNotificationDeliveryTest(env.DB);
 await deliverKasAccessNotifications(env.DB,env,{id:notice.id,limit:1,transport});
 const row=await env.DB.prepare('SELECT status FROM kas_access_notifications WHERE id=?').bind(notice.id).first();
 return json({sandbox:true,productionAuthority:false,notificationStatus:row.status});
}
