import {build} from 'esbuild';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
// Bundle the actual route; replace only the platform binding and verified-session seam.
export async function routeFixture(fixture) {
 globalThis.__reportSecurityFixture = fixture;
 const result = await build({entryPoints:['app/api/[...path]/route.ts'],bundle:true,write:false,platform:'node',format:'esm',packages:'external',plugins:[{name:'isolated-platform',setup(b){
  b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'fixture'}));
  b.onResolve({filter:/server\/email-auth$/},()=>({path:'auth',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='env'?'export const env=globalThis.__reportSecurityFixture.env;':'export async function getEmailUser(){return globalThis.__reportSecurityFixture.user;} export function emailAuth(){throw Error("Email disabled in report test");}',loader:'js'}));
 }}]});
 await mkdir('.wrangler',{recursive:true});
 const path=resolve('.wrangler/security-route-'+crypto.randomUUID()+'.mjs');
 await writeFile(path,result.outputFiles[0].contents);
 try{return await import(pathToFileURL(path).href);}finally{await unlink(path);}
}
