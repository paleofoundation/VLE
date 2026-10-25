import assert from 'node:assert/strict';
import test from 'node:test';
import {serviceAuthorized} from '../server/tecrid-service-auth.js';
import {reportAccess,reportPermissions,importTranscripts} from '../server/tecrid-report-service.ts';
const env={TECRID_EMAIL_RELAY_SECRET:'synthetic-mail-only-secret-32-characters'};
const req=(path)=>new Request('https://vle.exchange'+path,{method:'POST',headers:{authorization:'Bearer '+env.TECRID_EMAIL_RELAY_SECRET,'content-type':'application/json'},body:'{}'});
test('mail credential cannot authenticate any report-service audience',async()=>{for(const audience of ['report-read','report-workspace','report-permission','report-import'])assert.equal(await serviceAuthorized(req('/api/tecrid-report-access'),env,audience),false);});
for(const [path,handler] of [['/api/tecrid-report-access',reportAccess],['/api/tecrid-report-permissions',reportPermissions],['/api/tecrid-transcript-import',importTranscripts]])test('mail credential rejected before report operation '+path,async()=>{assert.equal((await handler(req(path),env)).status,401);});
