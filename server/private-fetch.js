import {getOriginalFetch} from 'vinext/shims/fetch-cache';
// Workers rejects redirect:'error'. Use manual mode and explicitly refuse
// redirects so private email requests never forward credentials to a new URL.
export async function privateFetch(input,init){
 const response=await Reflect.apply(getOriginalFetch(),globalThis,[input,{...init,redirect:'manual',cache:'no-store'}]);
 if(response.status>=300&&response.status<400)throw new Error('Private service redirects are not allowed.');
 return response;
}
