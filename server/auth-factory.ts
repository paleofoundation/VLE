import {privateFetch} from './private-fetch.js';
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';

// The factory also allows isolated tests to substitute email transport, never a
// production route or environment flag that can bypass mailbox verification.
export function createEmailAuth(db:any, schema:any, config:{secret:string;baseURL:string;apiKey:string;from:string}, transport:typeof fetch=privateFetch){
 if(!config.secret || config.secret.length<32)throw Error('Email authentication is not configured.');
 return betterAuth({
  logger:{disabled:true},
  appName:'Verified Lot Exchange',baseURL:config.baseURL,basePath:'/api/auth',secret:config.secret,
  database:drizzleAdapter(db,{provider:'sqlite',schema,transaction:false}),
  trustedOrigins:[config.baseURL,...(config.baseURL==='https://vle.exchange'?['https://www.vle.exchange','https://vle-lot-exchange-prototype.kmfp.chatgpt.site']:[])],
  emailAndPassword:{enabled:false},
  session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
  advanced:{cookiePrefix:'vle',useSecureCookies:config.baseURL.startsWith('https:'),ipAddress:{ipAddressHeaders:['cf-connecting-ip']},defaultCookieAttributes:{httpOnly:true,sameSite:'lax',path:'/'}},
  rateLimit:{enabled:true,storage:'database',window:60,max:60},
  plugins:[magicLink({expiresIn:600,storeToken:'hashed',rateLimit:{window:60,max:3},
   async sendMagicLink({email,url}){
    if(!config.apiKey||!config.from)throw Error('Email delivery is not configured.');
    const response=await transport('https://api.resend.com/emails',{
     method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json'},
     body:JSON.stringify({from:config.from,to:[email],subject:'Your VLE sign-in link',text:`Sign in to Verified Lot Exchange\n\n${url}\n\nThis link expires in 10 minutes and can be used once. If you did not request it, ignore this email.\n\nVLE will never ask for your password.`})
    });
    // Never log provider responses or the link: both can contain credentials.
    if(!response.ok)throw Error('Email delivery failed. Please try again shortly.');
   }
  })],
 });
}
