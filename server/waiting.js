// A task describes an existing participant-owned sourcing action, never an evidence grant.
export function waitingTask(room, role, lastEvent) {
 const record=typeof room.record==='string'?JSON.parse(room.record):room.record;
 const brief=typeof room.brief==='string'?JSON.parse(room.brief):room.brief;
 const base={roomId:room.id,version:room.version,lot:room.lot,supplier:room.supplier_name};
 if(room.stage==='Closed')return null;
 if(room.stage==='Soft hold requested'&&role==='supplier'&&record.hold&&Date.parse(record.hold.until+'T23:59:59Z')>=Date.now())return {...base,kind:'hold',key:'hold:'+room.version,title:'Approve this soft hold',detail:`${record.hold.quantity} ${brief.unit||'units'} through ${record.hold.until}. Contract and payment happen separately.`};
 if(room.stage==='Sample requested'&&record.costs&&!record.costs.agreed&&record.costs.by!==role)return {...base,kind:'costs',key:'costs:'+room.version,title:'Approve cost responsibility',detail:'Review the proposed shipping and testing responsibility before approving.',terms:{shipping:record.costs.shipping,testing:record.costs.testing}};
 if(lastEvent&&lastEvent.actor!==role&&!lastEvent.body.startsWith('Updated sourcing record:'))return {...base,kind:'answer',key:'answer:'+lastEvent.id,title:'Answer your '+(role==='buyer'?'supplier':'buyer'),detail:'A message in this conversation is waiting for your answer.',message:lastEvent.body};
 return null;
}

export async function waitingRequest(request,db,user,p){
 const headers={'Cache-Control':'private, no-store',Vary:'Cookie','X-Content-Type-Options':'nosniff'};
 const json=(body,status=200)=>Response.json(body,{status,headers});
 const run=(sql,...args)=>db.prepare(sql).bind(...args);
 const path=new URL(request.url).pathname;
 const rooms=(await run('SELECT * FROM sourcing_rooms WHERE buyer_id=? OR supplier_account_id=? OR (supplier_account_id IS NULL AND supplier_email=?) ORDER BY created_at DESC',user.userId,user.teamId||'',user.supplierEmail||user.email.toLowerCase()).all()).results;
 const taskFor=async room=>{
  const role=room.buyer_id===user.userId?'buyer':'supplier';
  const last=await run('SELECT id,actor,body FROM sourcing_events WHERE room_id=? ORDER BY created_at DESC,id DESC LIMIT 1',room.id).first();
  if(last?.actor===role&&last.body==='Updated sourcing record: Not now recorded.')return null;
  const task=waitingTask(room,role,last);return task?{...task,eventId:last?.id||null}:null;
 };
 if(request.method==='GET'&&path==='/api/sourcing/waiting'){
  const tasks=[];
  for(const room of rooms){const task=await taskFor(room);if(task)tasks.push(task);}
  return json({accountId:user.userId,readOnly:!!p.readOnly,tasks});
 }
 const match=path.match(/^\/api\/sourcing\/waiting\/([^/]+)\/(approve|not-now|answer)$/);
 if(request.method!=='POST'||!match)return json({error:'Not found.'},404);
 // The outer sourcing handler enforces membership, origin, read-only access and budgets.
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
 const {boundedText}=await import('./service-assertion.js');
 let body;try{body=JSON.parse(await boundedText(request,12000));}catch{return json({error:'Invalid action.'},400);}
 if(body.accountId!==user.userId)return json({error:'Your account changed. Refresh before saving.'},409);
 const room=rooms.find(r=>r.id===decodeURIComponent(match[1]));if(!room)return json({error:'Task not found.'},404);
 const task=await taskFor(room),action=match[2];
 if(!task||body.key!==task.key||body.version!==room.version)return json({error:'This task changed. Refresh before saving.'},409);
 if(action==='answer'&&task.kind!=='answer'||action==='approve'&&task.kind==='answer')return json({error:'This action is unavailable.'},400);
 const role=room.buyer_id===user.userId?'buyer':'supplier';
 let record=room.record,stage=room.stage,message='';
 if(action==='approve'){
  const {transitionRoom}=await import('./sourcing.js');
  try{const next=transitionRoom(room,role,{action:task.kind==='hold'?'confirm-hold':'agree-costs'});record=JSON.stringify(next.record);stage=next.stage;}catch{return json({error:'This task is no longer available.'},409);}
 }
 if(action==='answer'){message=String(body.message||'').trim();if(!message||message.length>3000)return json({error:'Write an answer of up to 3,000 characters.'},400);}
 const auditId=crypto.randomUUID(),timestamp=new Date().toISOString();
 // Batch executes atomically. The version predicate admits only one decision, even across clients.
 const result=await db.batch([
  run(`INSERT INTO sourcing_decisions (id,room_id,account_id,actor_id,task_key,kind,decision,room_version,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM sourcing_rooms WHERE id=? AND version=?) AND COALESCE((SELECT id FROM sourcing_events WHERE room_id=? ORDER BY created_at DESC,id DESC LIMIT 1),'')=?`,auditId,room.id,user.userId,user.actorUserId||user.userId,task.key,task.kind,action,room.version,timestamp,room.id,room.version,room.id,task.eventId||''),
  run('UPDATE sourcing_rooms SET stage=?,record=?,version=version+1 WHERE id=? AND version=? AND EXISTS (SELECT 1 FROM sourcing_decisions WHERE id=?)',stage,record,room.id,room.version,auditId),
  run('INSERT INTO sourcing_events (id,room_id,actor_id,actor,body,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM sourcing_decisions WHERE id=?)',crypto.randomUUID(),room.id,user.actorUserId||user.userId,role,message||'Updated sourcing record: '+(action==='approve'?'Approval recorded.':'Not now recorded.'),timestamp,auditId),
 ]);
 if(!result[0].meta.changes)return json({error:'This task changed. Refresh before saving.'},409);
 return json({ok:true,decisionId:auditId});
}
