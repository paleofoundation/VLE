import type { EmailUser } from './email-auth';
import { OWNER_EMAIL } from './owner';
const personalDomains = new Set(('gmail.com googlemail.com yahoo.com ymail.com rocketmail.com yahoo.co.uk yahoo.fr yahoo.de yahoo.ca yahoo.com.au hotmail.com hotmail.co.uk outlook.com live.com msn.com icloud.com me.com mac.com aol.com proton.me protonmail.com pm.me hey.com fastmail.com mail.com gmx.com gmx.de web.de tutanota.com tuta.com yandex.com yandex.ru mail.ru qq.com 163.com 126.com zoho.com comcast.net att.net sbcglobal.net verizon.net orange.fr wanadoo.fr laposte.net free.fr t-online.de btinternet.com btopenworld.com sky.com virginmedia.com talktalk.net rediffmail.com uol.com.br bol.com.br example.com example.org example.net mailinator.com guerrillamail.com 10minutemail.com temp-mail.org yopmail.com dispostable.com').split(' '));
export function permissions(user:EmailUser|null){
 const email=user?.email.toLowerCase()||'';
 const domain=email.split('@')[1]||'';
 const owner=!!user && email===OWNER_EMAIL;
 // Domain classification is display metadata only. It never grants authority.
 const companyEmail=!!user && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) && !personalDomains.has(domain) && !domain.endsWith('.example');
 return {signedIn:!!user,companyEmail,buyer:owner,owner,company:domain};
}
export const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
export function failure(message:string,status=403){return Response.json({error:message},{status,headers:privateHeaders});}
