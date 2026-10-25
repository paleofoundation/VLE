import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {drizzle} from 'drizzle-orm/d1';
import * as schema from '../db/schema.ts';
import {createEmailAuth} from '../server/auth-factory.ts';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'});
try{
const db=await mf.getD1Database('DB');
for(const file of ['0000_needy_cerebro.sql','0001_black_sharon_carter.sql'])for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
let mail=[],ip=1;
const auth=createEmailAuth(drizzle(db,{schema}),schema,{secret:'local-test-only-'.repeat(4),baseURL:'https://vle.test',apiKey:'test-key',from:'VLE <login@vle.test>'},async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');mail.push(JSON.parse(options.body));return Response.json({id:'test-message'});});
const call=(path,body,cookie='',origin='https://vle.test')=>auth.handler(new Request('https://vle.test/api/auth/'+path,{method:body?'POST':'GET',headers:{origin,'Content-Type':'application/json','cf-connecting-ip':`192.0.2.${ip++}`,cookie},...(body?{body:JSON.stringify(body)}:{})}));
const send=async(email)=>{let r=await call('sign-in/magic-link',{email,callbackURL:'/email-sign-in'});assert.equal(r.status,200);return mail.at(-1).text.match(/https:\/\/\S+/)[0];};
const link=await send('buyer@company.test');assert.equal(mail[0].to[0],'buyer@company.test');
const pending=await db.prepare('SELECT identifier FROM auth_verification').first();assert(!pending.identifier.includes(new URL(link).searchParams.get('token')));
let r=await auth.handler(new Request(link));assert.equal(r.status,302);let cookie=r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');assert(cookie.includes('vle.session_token'));assert(r.headers.get('set-cookie').includes('HttpOnly'));assert(r.headers.get('set-cookie').includes('Secure'));
let s=await auth.api.getSession({headers:new Headers({cookie})});assert.equal(s.user.email,'buyer@company.test');assert.equal(s.user.emailVerified,true);
r=await auth.handler(new Request(link));assert(new URL(r.headers.get('location')).searchParams.has('error'));assert(!r.headers.get('set-cookie')?.includes('session_token='));
// No recipient allowlist: an unrelated supplier email creates a separate verified identity.
const supplierLink=await send('supplier@independent-ingredients.test');assert.deepEqual(mail.at(-1).to,['supplier@independent-ingredients.test']);
r=await auth.handler(new Request(supplierLink,{headers:{'cf-connecting-ip':'192.0.2.210'}}));assert.equal(r.status,302);const supplierCookie=r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');const supplierSession=await auth.api.getSession({headers:new Headers({cookie:supplierCookie})});assert.equal(supplierSession.user.email,'supplier@independent-ingredients.test');assert.equal(supplierSession.user.emailVerified,true);assert.notEqual(supplierSession.user.id,s.user.id);assert.equal((await auth.api.getSession({headers:new Headers({cookie})})).user.email,'buyer@company.test');
const expired=await send('expired@company.test');await db.prepare('UPDATE auth_verification SET expires_at=0').run();r=await auth.handler(new Request(expired));assert(new URL(r.headers.get('location')).searchParams.has('error'));
r=await call('sign-out',{},cookie,'https://evil.test');assert.equal(r.status,403);assert(await auth.api.getSession({headers:new Headers({cookie})}));
r=await call('sign-out',{},cookie);assert.equal(r.status,200);assert.equal(await auth.api.getSession({headers:new Headers({cookie})}),null);
r=await call('sign-in/magic-link',{email:'redirect@company.test',callbackURL:'https://evil.test'});assert.equal(r.status,403);
// Use one IP for these requests to check the persisted limiter.
for(let i=0;i<4;i++){ip=100;r=await call('sign-in/magic-link',{email:'limited@company.test',callbackURL:'/'});}assert.equal(r.status,429);
const failing=createEmailAuth(drizzle(db,{schema}),schema,{secret:'local-test-only-'.repeat(4),baseURL:'https://vle.test',apiKey:'test',from:'VLE <login@vle.test>'},async()=>new Response('',{status:503}));
r=await failing.handler(new Request('https://vle.test/api/auth/sign-in/magic-link',{method:'POST',headers:{origin:'https://vle.test','content-type':'application/json','cf-connecting-ip':'192.0.2.200'},body:JSON.stringify({email:'failure@company.test'})}));assert(r.status>=400);
console.log('PASS: D1 email auth, verified identity, hashed one-use token, expiry, secure cookie, CSRF, sign-out revocation, redirect validation, persisted rate limit, delivery failure.');
}finally{await mf.dispose();}
