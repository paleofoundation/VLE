import {sourcingIdentity,recipientEmail} from './teams.js';
import {briefInput,sharedBrief,candidates,roomRole,transitionRoom} from './sourcing.js';
import {kasLots} from './kasandrinos.js';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
const json=(x,status=200)=>Response.json(x,{status,headers});
const id=()=>crypto.randomUUID(),now=()=>new Date().toISOString();
export async function sourcingRequest(request,db,bucket,user,p){
 if(!user)return json({error:'Sign in to open your sourcing workspace.'},401);
 const identity=await sourcingIdentity(db,user,p);user=identity.user;p=identity.p;
 if(request.method!=='GET'&&p.readOnly)return json({error:'This account grants you view-only access. Ask its owner for editing permission.'},403);
 const email=user.email.toLowerCase(),path=new URL(request.url).pathname;
 const run=(sql,...args)=>db.prepare(sql).bind(...args);
 const legacy=await run('SELECT manager_email FROM supplier_storefronts WHERE supplier=?','kasandrinos').first();
 const kasTeam=await run("SELECT contact_email FROM team_accounts WHERE id='kasandrinos-team'").first();
 const sf={manager_email:kasTeam?.contact_email||legacy?.manager_email};
 const account=await run('SELECT state FROM review_sessions WHERE user_id=?',user.userId).first();
 const profile=account?JSON.parse(account.state).supplierProfile:null;
 const supplier=profile?.id==='account-'+user.userId?profile:null;
 const isManager=p.team?.supplier_key==='kasandrinos';
 const notice=(to,message,href,accountId=null)=>run('INSERT INTO sourcing_notifications (id,email,message,href,account_id,created_at) VALUES (?,?,?,?,?,?)',id(),to,message,href,accountId,now());
 const brief=async key=>{const row=await run('SELECT * FROM sourcing_briefs WHERE id=? AND owner_id=?',key,user.userId).first();if(!row)throw Error('Private brief not found.');return row;};
 const room=async key=>{const row=await run('SELECT * FROM sourcing_rooms WHERE id=?',key).first();if(!row||!roomRole(row,user))throw Error('Conversation not found.');return row;};
 try{
 if(request.method==='GET'){
  if(path.startsWith('/api/sourcing/document/')){
   const row=await run('SELECT * FROM supplier_submissions WHERE id=?',path.split('/').at(-1)).first();if(!row)return json({error:'Document not found.'},404);
   const shared=p.buyer?await run("SELECT id FROM sourcing_rooms WHERE buyer_id=? AND json_extract(record,'$.source.submissionId')=? LIMIT 1",user.userId,row.id).first():null;
   if(row.owner_id!==user.userId&&!p.owner&&!shared)return json({error:'Document not found.'},404);
   const file=await bucket.get(row.file_key);if(!file)return json({error:'Document not found.'},404);
   return new Response(file.body,{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="supplier-lot-report.pdf"','Content-Security-Policy':"default-src 'none'; sandbox"}});
  }
  if(path!=='/api/sourcing')return json({error:'Not found'},404);
  const briefs=(await run('SELECT * FROM sourcing_briefs WHERE owner_id=? ORDER BY created_at DESC',user.userId).all()).results.map(r=>({...r,body:JSON.parse(r.body),candidates:candidates(JSON.parse(r.body))}));
  const opportunities=supplier||isManager?(await run("SELECT id,body,created_at FROM sourcing_briefs WHERE shared=1 AND status='Open' AND category=? AND owner_id<>? ORDER BY created_at DESC",isManager?'Olive oil':supplier.category,user.userId).all()).results.map(r=>({id:r.id,body:sharedBrief(JSON.parse(r.body)),created_at:r.created_at})):[];
  const rooms=(await run('SELECT * FROM sourcing_rooms WHERE buyer_id=? OR supplier_account_id=? OR (supplier_account_id IS NULL AND supplier_email=?) ORDER BY created_at DESC',user.userId,user.teamId||'',user.supplierEmail||email).all()).results;
  for(const r of rooms){r.role=roomRole(r,user);r.brief=JSON.parse(r.brief);r.record=JSON.parse(r.record);if(['Soft hold requested','Soft hold confirmed'].includes(r.stage)&&Date.parse(r.record.hold?.until+'T23:59:59Z')<Date.now())r.stage='Soft hold expired';r.events=(await run('SELECT actor,body,created_at FROM sourcing_events WHERE room_id=? ORDER BY created_at,id',r.id).all()).results;}
  const notifications=(await run('SELECT * FROM sourcing_notifications WHERE account_id=? OR (account_id IS NULL AND email=?) ORDER BY created_at DESC LIMIT 100',user.userId,email).all()).results;
  const preferences=await run('SELECT email_enabled FROM sourcing_preferences WHERE email=?',user.userId).first();
  const submissions=(await (p.owner?run('SELECT * FROM supplier_submissions ORDER BY created_at DESC'):run('SELECT * FROM supplier_submissions WHERE owner_id=? ORDER BY created_at DESC',user.userId)).all()).results.map(r=>({...r,body:JSON.parse(r.body)}));
  return json({accountId:user.userId,briefs,opportunities,rooms,notifications,submissions,emailEnabled:preferences?.email_enabled!==0,team:p.team||null,readOnly:!!p.readOnly,canBuy:p.buyer,canReview:p.owner,isSupplier:!!supplier||isManager,isManager,managerConnected:!!sf?.manager_email});
 }
 if(request.method!=='POST')return json({error:'Not found'},404);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Same-origin request required.'},403);
 if(path==='/api/sourcing/upload'){
  if(!supplier&&!isManager)return json({error:'Set up your supplier workspace first.'},403);
  if(Number(request.headers.get('content-length'))>12000000)return json({error:'PDF must be under 10 MB.'},413);
  const form=await request.formData(),file=form.get('file');if(form.get('accountId')!==user.userId)return json({error:'Your active account changed. Refresh before submitting.'},409);if(!(file instanceof File)||file.size>10000000||file.size<5)throw Error('Choose a PDF under 10 MB.');
  const body={company:supplier?.name||'Kasandrinos',product:String(form.get('product')||'').trim().slice(0,200),lot:String(form.get('lot')||'').trim().slice(0,120),category:String(form.get('category')||supplier?.category||'Olive oil'),notes:String(form.get('notes')||'').slice(0,2000),email};
  if(!body.product||!body.lot||form.get('confirmed')!=='on')throw Error('Name the product and specific lot, and confirm the report belongs to that lot.');
  const bytes=await file.arrayBuffer();if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Use an original PDF report.');
  const key='supplier-submissions/'+user.userId+'/'+id()+'.pdf',keyId=id();await bucket.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});
  await run('INSERT INTO supplier_submissions (id,owner_id,body,file_key,created_at) VALUES (?,?,?,?,?)',keyId,user.userId,JSON.stringify(body),key,now()).run();
  return json({id:keyId,message:'Report submitted privately for review.'});
 }
 if(path!=='/api/sourcing')return json({error:'Not found'},404);
 const raw=await request.text();if(raw.length>20000)return json({error:'Request too large.'},413);
 const d=JSON.parse(raw);if(d.accountId!==user.userId)return json({error:'Your active account changed. Refresh before saving.'},409);
 if(d.action==='save-brief'){
  if(!p.buyer)return json({error:'An explicit brand account membership is required.'},403);
  const b=briefInput(d),key=d.id||id();
  if(d.id){const old=await brief(d.id);if(old.shared)throw Error('Unshare the brief before editing its requirements.');const r=await run('UPDATE sourcing_briefs SET body=?,category=?,version=version+1 WHERE id=? AND owner_id=? AND version=?',JSON.stringify(b),b.category,key,user.userId,d.version).run();if(!r.meta.changes)return json({error:'This brief changed. Refresh before saving.'},409);}
  else await run('INSERT INTO sourcing_briefs (id,owner_id,category,body,created_at) VALUES (?,?,?,?,?)',key,user.userId,b.category,JSON.stringify(b),now()).run();
  return json({id:key});
 }
 if(d.action==='private-progress'){const r=await brief(d.id);const b=JSON.parse(r.body);b.notes=String(d.notes||'').slice(0,4000);b.progress=String(d.progress||'');if(!['Define target','Find alternatives','Evaluate samples','Retest','Ready for purchasing'].includes(b.progress))throw Error('Choose a progress milestone.');const saved=await run('UPDATE sourcing_briefs SET body=?,version=version+1 WHERE id=? AND owner_id=? AND version=?',JSON.stringify(b),r.id,user.userId,d.version).run();if(!saved.meta.changes)return json({error:'Brief changed. Refresh and retry.'},409);return json({ok:true});}
 if(['share-brief','unshare-brief','close-brief'].includes(d.action)){
  const b=await brief(d.id);const shared=d.action==='share-brief'?1:0;
  if(b.status!=='Open'&&shared)throw Error('A closed brief cannot be shared.');
  const changed=await run('UPDATE sourcing_briefs SET shared=?,status=?,version=version+1 WHERE id=? AND owner_id=? AND version=?',shared,d.action==='close-brief'?'Closed':b.status,b.id,user.userId,d.version).run();if(!changed.meta.changes)return json({error:'Brief changed. Refresh and retry.'},409);
  if(shared&&!b.shared){
   const accounts=(await run('SELECT r.user_id,r.state,u.email FROM review_sessions r JOIN auth_user u ON u.id=r.user_id WHERE u.email_verified=1 AND r.user_id<>?',user.userId).all()).results;
   const recipients=new Map(accounts.filter(a=>JSON.parse(a.state).supplierProfile?.category===b.category).map(a=>[a.user_id,a.email]));if(b.category==='Olive oil'&&sf?.manager_email)recipients.set('kasandrinos-team',sf.manager_email);const teamSuppliers=(await run("SELECT t.id,t.contact_email,r.state FROM team_accounts t JOIN review_sessions r ON r.user_id=t.id WHERE t.kind='supplier'").all()).results;for(const team of teamSuppliers)if(JSON.parse(team.state).supplierProfile?.category===b.category)recipients.set(team.id,team.contact_email);recipients.delete(user.userId);
   if(recipients.size)await db.batch([...recipients].map(([account,to])=>notice(to,'A buyer shared a sourcing brief in your category.','/requests',account)));
  }
  return json({ok:true});
 }
 if(d.action==='start-room'||d.action==='respond'){
  let buyerId,supplierEmail,supplierName,summary,submissionId=null,supplierAccountId=null,lot=String(d.lot||''),b;
  if(d.action==='start-room'){
   if(!p.buyer)throw Error('An explicit brand account membership is required.');b=await brief(d.briefId);if(b.status!=='Open')throw Error('This brief is closed.');
   if(!kasLots.some(l=>l.id===lot&&l.category===b.category))throw Error('Choose a matching catalog lot.');
   if(!sf?.manager_email)throw Error('Kasandrinos’s supplier account is not connected yet. Save this candidate and return after its manager is assigned.');
   buyerId=user.userId;supplierAccountId='kasandrinos-team';supplierEmail=sf.manager_email;supplierName='Kasandrinos';summary=sharedBrief(JSON.parse(b.body));
  }else{
   if(!supplier&&!isManager)throw Error('Supplier workspace required.');
   b=await run("SELECT * FROM sourcing_briefs WHERE id=? AND shared=1 AND status='Open'",d.briefId).first();
   if(!b||b.category!==(isManager?'Olive oil':supplier.category))throw Error('Opportunity not found.');
   if(isManager){if(!kasLots.some(l=>l.id===lot))throw Error('Choose your documented lot.');}
   else{const submission=await run("SELECT body FROM supplier_submissions WHERE id=? AND owner_id=? AND status='Reviewed'",lot,user.userId).first();if(!submission)throw Error('Submit a lot report and complete review before replying.');submissionId=lot;const sb=JSON.parse(submission.body);if(sb.category!==b.category)throw Error('Choose a lot in the request category.');lot=sb.lot;}
   buyerId=b.owner_id;supplierAccountId=p.team?.id||null;supplierEmail=email;supplierName=isManager?'Kasandrinos':supplier.name;summary=sharedBrief(JSON.parse(b.body));
  }
  if(supplierAccountId ? buyerId===supplierAccountId : buyerId===user.userId)throw Error('A sourcing conversation requires two different participants.');
  const message=String(d.message||'').trim().slice(0,2000);if(!message)throw Error('Write a message to the other participant.');
  const key=id(),buyerEmail=await recipientEmail(db,buyerId);if(!buyerEmail)throw Error('Buyer account unavailable.');
  await db.batch([run('INSERT INTO sourcing_rooms (id,buyer_id,supplier_email,supplier_account_id,supplier_name,lot,brief,record,created_at) VALUES (?,?,?,?,?,?,?,?,?)',key,buyerId,supplierEmail,supplierAccountId,supplierName,lot,JSON.stringify(summary),JSON.stringify(submissionId?{source:{submissionId}}:{}),now()),run('INSERT INTO sourcing_events (id,room_id,actor_id,actor,body,created_at) VALUES (?,?,?,?,?,?)',id(),key,user.actorUserId||user.userId,d.action==='respond'?'supplier':'buyer',message,now()),notice(d.action==='respond'?buyerEmail:supplierEmail,'A new sourcing conversation is ready.','/deals/room?id='+key,d.action==='respond'?buyerId:supplierAccountId)]);
  return json({id:key});
 }
 if(d.action==='message'||d.action==='transition'){
  const r=await room(d.id),role=roomRole(r,user);
  const recipient=role==='buyer'?r.supplier_email:await recipientEmail(db,r.buyer_id);
  let body;
  if(d.action==='message'){body=String(d.message||'').trim().slice(0,3000);if(!body)throw Error('Write a message.');}
  else {const next=transitionRoom(r,role,d.values||{});const changed=await run('UPDATE sourcing_rooms SET stage=?,record=?,version=version+1 WHERE id=? AND version=?',next.stage,JSON.stringify(next.record),r.id,d.version).run();if(!changed.meta.changes)return json({error:'The conversation changed. Refresh before updating.'},409);body='Updated sourcing record: '+next.stage+'.';}
  await db.batch([run('INSERT INTO sourcing_events (id,room_id,actor_id,actor,body,created_at) VALUES (?,?,?,?,?,?)',id(),r.id,user.actorUserId||user.userId,role,body,now()),notice(recipient,'There is an update in your sourcing conversation.','/deals/room?id='+r.id,role==='buyer'?r.supplier_account_id:r.buyer_id)]);
  return json({ok:true});
 }
 if(d.action==='read'){await run('UPDATE sourcing_notifications SET read=1 WHERE account_id=? OR (account_id IS NULL AND email=?)',user.userId,email).run();return json({ok:true});}
 if(d.action==='preferences'){if(typeof d.enabled!=='boolean')throw Error('Choose an email preference.');await run('INSERT INTO sourcing_preferences (email,email_enabled) VALUES (?,?) ON CONFLICT(email) DO UPDATE SET email_enabled=excluded.email_enabled',user.userId,d.enabled?1:0).run();return json({ok:true});}
 if(d.action==='review-submission'){
  if(!p.owner)return json({error:'Owner access required.'},403);if(!['Reviewed','Needs correction'].includes(d.status))throw Error('Choose a review outcome.');
  const r=await run('SELECT * FROM supplier_submissions WHERE id=?',d.id).first();if(!r)throw Error('Submission not found.');const note=String(d.review||'').trim().slice(0,2000);if(!note)throw Error('Record the review findings.');
  await db.batch([run('UPDATE supplier_submissions SET status=?,review=? WHERE id=?',d.status,note,d.id),notice(JSON.parse(r.body).email,'Your lot document review has been updated.','/workspace/documents',r.owner_id)]);return json({ok:true});
 }
 return json({error:'Unknown action.'},400);
 }catch(error){return json({error:error.message||'Unable to complete the request.'},400);}
}
