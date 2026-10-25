import { env } from 'cloudflare:workers';
import { getDb } from '../db';
import * as schema from '../db/schema';
import { createEmailAuth } from './auth-factory';
export type EmailUser={userId:string;email:string;displayName:string};
export function emailAuth(){
 const e=env as unknown as Record<string,string>;
 return createEmailAuth(getDb(),schema,{secret:e.BETTER_AUTH_SECRET,baseURL:e.BETTER_AUTH_URL||'https://vle.exchange',apiKey:e.RESEND_API_KEY,from:e.VLE_EMAIL_FROM});
}
export async function getEmailUser(request:Request):Promise<EmailUser|null>{
 // Public browsing remains available while email delivery is being configured.
 if(!(env as any).BETTER_AUTH_SECRET)return null;
 const result=await emailAuth().api.getSession({headers:request.headers});
 if(!result?.user.emailVerified)return null;
 return {userId:result.user.id,email:result.user.email,displayName:result.user.name||result.user.email};
}
