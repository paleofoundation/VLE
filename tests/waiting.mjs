import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {sourcingRequest} from '../server/sourcing-api.js';
import {waitingTask} from '../server/waiting.js';
import {waitingHome,mountWaiting} from '../public/waiting.js';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'});
try{
 const db=await mf.getD1Database('DB');
 for(const file of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
 const buyer={userId:'buyer',email:'buyer@example.invalid'},supplier={userId:'supplier',email:'supplier@example.invalid'},stranger={userId:'stranger',email:'stranger@example.invalid'};
 for(const u of [buyer,supplier,stranger])await db.prepare('INSERT INTO auth_user (id,name,email,email_verified,created_at,updated_at) VALUES (?,?,?,1,0,0)').bind(u.userId,u.userId,u.email).run();
 const invoke=(u,path='/api/sourcing/waiting',body,origin='https://vle.test')=>sourcingRequest(new Request('https://vle.test'+path,{method:body?'POST':'GET',headers:{origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),db,null,u,{buyer:u?.userId==='buyer'});
 const list=async u=>(await (await invoke(u)).json());
 const seed=async(id,stage,record,actor='supplier')=>{
  await db.prepare('INSERT INTO sourcing_rooms (id,buyer_id,supplier_email,supplier_name,lot,brief,stage,record,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,'buyer',supplier.email,'EXAMPLE supplier','SYNTHETIC-LOT',JSON.stringify({unit:'kg'}),stage,JSON.stringify(record),'2026-10-01T00:00:00Z').run();
  await db.prepare('INSERT INTO sourcing_events (id,room_id,actor_id,actor,body,created_at) VALUES (?,?,?,?,?,?)').bind('message-'+id,id,actor,actor,'A private question with result 0.007 mg/kg.','2026-10-01T00:00:00Z').run();
 };
 const act=(u,task,action,extra={},origin)=>invoke(u,'/api/sourcing/waiting/'+task.roomId+'/'+action,{accountId:u.userId,version:task.version,key:task.key,...extra},origin);
 assert.equal((await invoke(null)).status,401);
 await seed('cost','Sample requested',{costs:{shipping:'Supplier pays shipping',testing:'Buyer pays testing',by:'supplier',agreed:false}});
 let task=(await list(buyer)).tasks[0];assert.equal(task.kind,'costs');assert.equal((await list(stranger)).tasks.length,0);
 assert.equal((await act(stranger,task,'approve')).status,404);
 assert.equal((await act(buyer,task,'approve',{},'https://evil.test')).status,403);
 assert.equal((await act(buyer,task,'approve',{accountId:'other'})).status,409);
 assert.equal((await act(buyer,task,'answer',{message:'wrong action'})).status,400);
 const approvals=await Promise.all([act(buyer,task,'approve'),act(buyer,task,'approve')]);assert.deepEqual(approvals.map(r=>r.status).sort(),[200,409]);
 const audit=await db.prepare('SELECT * FROM sourcing_decisions').all();assert.equal(audit.results.length,1);assert.equal(audit.results[0].actor_id,'buyer');assert.equal(audit.results[0].decision,'approve');assert.equal(audit.results[0].room_version,0);
 assert.equal(JSON.parse((await db.prepare("SELECT record FROM sourcing_rooms WHERE id='cost'").first()).record).costs.agreed,true);
 assert.equal((await act(buyer,task,'approve')).status,409);assert.equal((await list(buyer)).tasks.length,0);
 console.log('PASS: anonymous/cross-account/origin/account-switch/action guards, concurrent approval and audit data.');
 await seed('hold','Soft hold requested',{hold:{quantity:80,until:'2099-01-01'}},'buyer');
 task=(await list(supplier)).tasks.find(t=>t.roomId==='hold');assert.equal(task.kind,'hold');assert.match(task.detail,/80 kg/);
 assert.equal((await act(supplier,task,'not-now')).status,200);assert(!(await list(supplier)).tasks.some(t=>t.roomId==='hold'));
 await db.prepare("INSERT INTO sourcing_events (id,room_id,actor_id,actor,body,created_at) VALUES ('new-hold','hold','buyer','buyer','A new update','2090-01-01')").run();
 task=(await list(supplier)).tasks.find(t=>t.roomId==='hold');assert(task);assert.equal((await act(supplier,task,'approve')).status,200);assert.equal((await db.prepare("SELECT stage FROM sourcing_rooms WHERE id='hold'").first()).stage,'Soft hold confirmed');
 await seed('expired','Soft hold requested',{hold:{quantity:1,until:'2000-01-01'}},'buyer');
 assert(!(await list(supplier)).tasks.some(t=>t.roomId==='expired'&&t.kind==='hold'));
 await seed('answer','Inquiry',{});
 task=(await list(buyer)).tasks.find(t=>t.roomId==='answer');assert.equal(task.kind,'answer');
 assert.equal((await act(buyer,task,'approve')).status,400);assert.equal((await act(buyer,task,'answer',{message:''})).status,400);
 assert.equal((await act(buyer,task,'answer',{message:'Private answer <script>alert(1)</script>'})).status,200);
 assert(!(await list(buyer)).tasks.some(t=>t.roomId==='answer'));
 assert((await list(supplier)).tasks.some(t=>t.roomId==='answer'&&t.kind==='answer'));
 assert.equal((await db.prepare("SELECT count(*) AS n FROM sourcing_notifications").first()).n,0,'No result values or answer text become notifications');
 console.log('PASS: scoped hold approval, deferral/new update, expired hold, private answer, no outbound or result-bearing notifications.');
 // Real selected-team viewer permission, not a client-supplied role.
 await db.prepare("INSERT INTO team_accounts (id,name,kind,owner_email,contact_email,created_at) VALUES ('view-team','Synthetic team','buyer','owner@example.invalid','contact@example.invalid','2026-01-01')").run();
 await db.prepare("INSERT INTO team_members (id,team_id,email,role,source) VALUES ('synthetic-viewer','view-team',?,'viewer','invited')").bind(buyer.email).run();
 await db.prepare("INSERT INTO team_selections (user_id,team_id) VALUES ('buyer','view-team')").run();
 assert.equal((await list(buyer)).readOnly,true);assert.equal((await act(buyer,task,'approve')).status,403);
 console.log('PASS: viewer membership remains read-only.');
 await seed('sort-older','Inquiry',{});
 await seed('sort-newer','Inquiry',{});
 await db.prepare("UPDATE sourcing_events SET created_at='2026-10-20T00:00:00Z' WHERE room_id='sort-newer'").run();
 const ordered=(await list(stranger)).tasks;assert.equal(ordered.length,0);
 // Room creation is identical: event activity, not room creation, chooses task order.
 await db.prepare("DELETE FROM team_selections WHERE user_id='buyer'").run();
 const newest=(await list(buyer)).tasks.filter(t=>t.roomId.startsWith('sort-'));
 assert.deepEqual(newest.map(t=>t.roomId),['sort-newer','sort-older']);
 console.log('PASS: inbox sorts by newest task activity, independent of conversation creation.');

 await seed('race','Inquiry',{});
 const pending=(await list(supplier)).tasks.find(t=>t.roomId==='answer');
 let armed=false;
 const guardedDb={prepare(sql){if(sql.startsWith('INSERT INTO sourcing_decisions'))armed=true;return db.prepare(sql);},async batch(statements){if(armed){armed=false;await db.prepare("INSERT INTO sourcing_events (id,room_id,actor_id,actor,body,created_at) VALUES ('racing-message',?,'buyer','buyer','A newer private question','2099-01-01')").bind(pending.roomId).run();}return db.batch(statements);}};
 const race=await sourcingRequest(new Request('https://vle.test/api/sourcing/waiting/'+pending.roomId+'/answer',{method:'POST',headers:{origin:'https://vle.test','Content-Type':'application/json'},body:JSON.stringify({accountId:supplier.userId,key:pending.key,version:pending.version,message:'Stale answer'})}),guardedDb,null,supplier,{buyer:false});
 assert.equal(race.status,409,'A new legacy message arriving after task read invalidates the action atomically');
 assert.equal((await db.prepare("SELECT count(*) AS n FROM sourcing_events WHERE body='Stale answer'").first()).n,0);
 assert(!(JSON.stringify((await db.prepare('SELECT * FROM sourcing_decisions').all()).results).includes('0.007')));
 console.log('PASS: latest-message race blocks the stale answer and audit remains metadata only.');

 const snapshot={tasks:[{...task,title:'Answer <script>',supplier:'Synthetic <supplier>',lot:'LOT',detail:'Private task',message:'<script>private</script>'}],readOnly:false};
 for(const role of ['brand','supplier']){
  const html=waitingHome(snapshot,role);assert.match(html,/Waiting on you/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.equal((html.match(/<button/g)||[]).length,2);assert.doesNotMatch(html,/0\.007|mg\/kg|[\u2013\u2014]|pricing|partner/i);
  const answer=waitingHome(snapshot,role,{answer:task.roomId});assert.equal((answer.match(/<button/g)||[]).length,2);assert.match(answer,/Send answer/);assert.match(answer,/&lt;script&gt;private/);
 }
 assert.match(waitingHome({tasks:[]},'brand'),/all caught up/);
 assert.match(waitingHome({...snapshot,readOnly:true},'supplier'),/disabled/);
 // Tap controller: approve invokes POST directly; Answer opens once, Send submits once.
 const handlers={},previousDocument=globalThis.document;let draws=0;
 globalThis.document={addEventListener:(k,fn)=>{handlers[k]=fn;},querySelector:()=>({focus(){}})};
 mountWaiting(()=>{draws++;});
 await handlers.click({target:{closest:()=>({dataset:{waitingAction:'open-answer',room:task.roomId}})}});assert.equal(draws,1);
 globalThis.document=previousDocument;
 assert.equal(waitingTask({id:'closed',version:0,stage:'Closed',record:{},brief:{}},'buyer',null),null);
 console.log('PASS: escaped role home, two-button cap, empty/viewer state, Answer first tap and plain-language copy.');
}finally{await mf.dispose();}
