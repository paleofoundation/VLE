import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {tecridEmailRelay} from '../server/tecrid-email-relay.ts';
import {signedServiceInit} from '../server/service-assertion.js';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-22'});
try{
 const DB=await mf.getD1Database('DB');for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const s of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(s.trim())await DB.prepare(s).run();
 const env={DB,TECRID_EMAIL_RELAY_SECRET:'synthetic-relay-'.repeat(4),TECRID_MAIL_ISSUANCE_SECRET:'synthetic-issuance-'.repeat(4),RESEND_API_KEY:'synthetic-provider',VLE_EMAIL_FROM:'Synthetic <mail@security.test>'};let sent=0;
 const url='https://vle.exchange/api/tecrid-email';
 const request=async(body,token=env.TECRID_EMAIL_RELAY_SECRET)=>{const init=await signedServiceInit(url,body,env,'mail-issuance');return new Request(url,{...init,headers:{...init.headers,authorization:'Bearer '+token,'x-tecrid-mail-issuance':init.headers.authorization}});};
 const transport=async(target,options)=>{sent++;assert.equal(target,'https://api.resend.com/emails');assert.match(options.headers['idempotency-key'],/^tecrid-mail-[a-f0-9]{64}$/);return Response.json({id:'synthetic'});};
 const call=async(body,token)=>tecridEmailRelay(await request(body,token),env,transport);
 const good={email:'lab@security.test',url:'https://tecrid.com/api/auth/magic-link/verify?token=synthetic-issued&callbackURL=%2Fdashboard'};
 assert.equal((await call(good,'wrong')).status,401);
 for(const body of [{...good,url:'https://evil.test/api/auth/magic-link/verify?token=test'},{...good,url:'https://tecrid.com/other?token=test'},{...good,url:good.url+'&errorCallbackURL=https://evil.test'},{...good,email:'bad\naddress'}])assert.equal((await call(body)).status,400);
 const original=await request(good),tamperedHeaders=original.headers;
 assert.equal((await tecridEmailRelay(new Request(url,{method:'POST',headers:tamperedHeaders,body:JSON.stringify({...good,email:'wrong@security.test'})}),env,transport)).status,401);assert.equal(sent,0);
 const response=await tecridEmailRelay(original.clone(),env,transport);assert.equal(response.status,200);assert.equal(sent,1);
 assert.equal((await tecridEmailRelay(original.clone(),env,transport)).status,401);assert.equal(sent,1);
 assert.equal((await call(good)).status,200);assert.equal(sent,1,'A freshly signed duplicate token/recipient is idempotent');
 for(let i=1;i<=3;i++){const r=await call({...good,url:good.url.replace('synthetic-issued','synthetic-issued-'+i)});assert.equal(r.status,i<=2?200:429);}
 assert.equal(sent,3);
 console.log('PASS: issuance-bound recipient/token, mail-only denial, tamper and replay denial, idempotent delivery, recipient quota across requests, fixed link/redirect scope and zero real mail.');
}finally{await mf.dispose();}
