import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {Miniflare} from 'miniflare';
import * as receiver from '../server/service-assertion.js';
const peer=resolve(process.argv[2]||'');
if(!process.argv[2])throw Error('Pass the TECRID lib/service-assertion.js path.');
const sender=await import(pathToFileURL(peer));
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['VLE','TECRID'],compatibilityDate:'2026-05-22'});
try{
 const make=async(name)=>{const DB=await mf.getD1Database(name);for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const s of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(s.trim())await DB.prepare(s).run();return {DB,TECRID_EMAIL_RELAY_SECRET:'synthetic-mail-'.repeat(4),TECRID_REPORT_READ_SECRET:'synthetic-read-'.repeat(4),TECRID_NOTIFICATION_SERVICE_SECRET:'synthetic-notification-'.repeat(4)};};
 const vle=await make('VLE'),tecrid=await make('TECRID');
 for(const [from,to,env,url,audience] of [[sender,receiver,vle,'https://vle.exchange/api/tecrid-report-access','report-read'],[receiver,sender,tecrid,'https://tecrid.com/api/integrations/vle/notifications','notifications-to-tecrid']]){
  const request=new Request(url,await from.signedServiceInit(url,{actor:{email:'synthetic@security.test',emailVerified:true}},env,audience));
  assert.equal(await to.verifyServiceAssertion(request.clone(),env,audience),true);
  assert.equal(await to.verifyServiceAssertion(request.clone(),env,audience),false);
 }
 const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
 assert.equal(hash(peer),hash('server/service-assertion.js'));
 console.log(JSON.stringify({protocol:'tecrid-service/1',moduleSha256:hash(peer),crossRepositoryDirections:2,accepted:2,replayRejected:2,externalCalls:0,productionAccess:false},null,2));
}finally{await mf.dispose();}
