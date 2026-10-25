import assert from 'node:assert/strict';
import test from 'node:test';
import {tecridEmailRelay} from '../server/tecrid-email-relay.ts';
const env={TECRID_EMAIL_RELAY_SECRET:'synthetic-mail-only-'.repeat(3),RESEND_API_KEY:'synthetic-provider',VLE_EMAIL_FROM:'Synthetic <sender@security.test>'};
test('mail credential alone cannot choose a token and recipient',async()=>{let sent=0;const r=await tecridEmailRelay(new Request('https://vle.exchange/api/tecrid-email',{method:'POST',headers:{authorization:'Bearer '+env.TECRID_EMAIL_RELAY_SECRET},body:JSON.stringify({email:'unissued@security.test',url:'https://tecrid.com/api/auth/magic-link/verify?token=not-issued'})}),env,async()=>{sent++;return Response.json({id:'synthetic'});});assert.equal(r.status,401);assert.equal(sent,0);});
