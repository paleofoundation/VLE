import { shell } from "../../server/shell";
export const dynamic = "force-dynamic";
export function GET(request:Request){
 const path=new URL(request.url).pathname;
 if(path==="/favicon.ico")return Response.redirect(new URL("/favicon.svg",request.url),302);
 const known=/^\/(?:organizations\/[a-z0-9-]+|proof|reports\/ll-(?:43295|43296|43297|43298|43299|43300|43301|43302)|faq|boundaries|how-it-works|team|about|privacy|contact|brand|sourcing|notifications|workspace(?:\/(?:documents|storefront))?|suppliers(?:\/kasandrinos(?:\/products\/extra-virgin-olive-oil)?)?|lots\/[A-Za-z0-9][A-Za-z0-9._:-]*|requests(?:\/new)?|deals(?:\/room)?|email-sign-in|resources(?:\/labs\/light-labs)?|design-system)?\/?$/.test(path);
 const titles:Record<string,string>={"/faq":"FAQ | VLE","/boundaries":"Sourcing boundaries | VLE","/how-it-works":"How does this work? | VLE","/":"VLE | Meet your next source","/privacy":"Privacy policy | VLE","/about":"About Verified Lot Exchange | VLE","/contact":"Contact VLE","/team":"Account and team | VLE","/brand":"Your sourcing desk | VLE","/requests":"Sourcing requests | VLE","/requests/new":"Create a private sourcing brief | VLE","/sourcing":"Private sourcing | VLE","/deals":"Sourcing conversations | VLE","/deals/room":"Private conversation | VLE","/notifications":"Notifications | VLE","/suppliers":"Ingredient suppliers and documented lots | VLE","/suppliers/kasandrinos":"Kasandrinos olive oil and lot evidence | VLE"};
 const privatePage=/^\/(proof|reports|team|brand|sourcing|requests|deals|notifications|workspace|email-sign-in|design-system)(\/|$)/.test(path);
 const title=titles[path]||'Lot evidence and ingredient sourcing | VLE';
 const head=`<link rel="canonical" href="https://vle.exchange${path.replace(/[^a-zA-Z0-9/_-]/g,'')}">${privatePage?'<meta name="robots" content="noindex,nofollow">':''}`;
 const html=shell.replace('<title>VLE | Meet your next source</title>',`<title>${title}</title>`).replace('</head>',head+'</head>');
 return new Response(known?html:"Not found",{status:known?200:404,headers:{"Content-Type":known?"text/html; charset=utf-8":"text/plain","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"same-origin"}});
}
