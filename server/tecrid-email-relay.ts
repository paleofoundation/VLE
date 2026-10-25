import {privateFetch} from './private-fetch.js';
// Only the TECRID authentication service can call this endpoint. No arbitrary mail.
export async function tecridEmailRelay(request:Request,env:Record<string,any>,transport:typeof fetch=privateFetch){
 const secret=env.TECRID_EMAIL_RELAY_SECRET;
 const supplied=request.headers.get('authorization')||'';
 if(!secret)return new Response(null,{status:503});
 const hash=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const a=await hash(supplied),b=await hash(`Bearer ${secret}`);let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
 if(mismatch)return new Response(null,{status:401});
 if(Number(request.headers.get('content-length'))>8192)return new Response(null,{status:413});
 let input:any;try{const body=await request.text();if(body.length>8192)return new Response(null,{status:413});input=JSON.parse(body);}catch{return new Response(null,{status:400});}
 const email=input?.email;
 if(typeof email!=='string'||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof input?.url!=='string')return new Response(null,{status:400});
 let url:URL;try{url=new URL(input.url);}catch{return new Response(null,{status:400});}
 if(url.origin!=='https://tecrid.com'||url.pathname!=='/api/auth/magic-link/verify'||url.username||url.password||url.hash||!url.searchParams.get('token'))return new Response(null,{status:400});
 for(const key of ['callbackURL','newUserCallbackURL','errorCallbackURL']){const value=url.searchParams.get(key);if(value){try{const dest:URL=new URL(value,url.origin);if(dest.origin!==url.origin)return new Response(null,{status:400});}catch{return new Response(null,{status:400});}}}
 if(!env.RESEND_API_KEY||!env.VLE_EMAIL_FROM)return new Response(null,{status:503});
 try{
 const sent=await transport('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:env.VLE_EMAIL_FROM,to:[email],subject:'Your TECRID work-email sign-in link',text:`Sign in to TECRID\n\n${url.href}\n\nThis link expires in 10 minutes and works once. If you did not request it, ignore this email.\n\nTECRID uses the shared VLE email delivery service.`})});
 if(!sent.ok)return Response.json({error:'Email delivery failed.'},{status:502});
 return Response.json({accepted:true},{headers:{'cache-control':'no-store'}});
 }catch{return Response.json({error:'Email delivery unavailable.'},{status:502});}
}
