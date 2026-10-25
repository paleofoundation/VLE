export async function serviceAuthorized(request,env){
 if(!env.TECRID_EMAIL_RELAY_SECRET)return false;
 const digest=async(s)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const a=await digest(request.headers.get('authorization')||''),b=await digest(`Bearer ${env.TECRID_EMAIL_RELAY_SECRET}`);let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];return d===0;
}
