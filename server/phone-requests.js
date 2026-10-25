import {sourcingIdentity} from './teams.js';
import {takeBudget} from './abuse-budget.js';
import {boundedText} from './service-assertion.js';
import {RequestError,text,accountId,ingredientCode,version,requestInput,answerInput,fingerprint} from './phone-request-policy.js';
import {recordsOnFile,digitizedInput} from './phone-request-assets.js';
const headers={'Cache-Control':'private, no-store, max-age=0',Vary:'Cookie','X-Content-Type-Options':'nosniff'};
const json=(body,status=200)=>Response.json(body,{status,headers});
const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
const rows=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const publicSuppliers=`SELECT DISTINCT t.id AS account_id,l.ingredient_code,
 COALESCE((SELECT ingredient_label FROM phone_supplier_catalog WHERE ingredient_code=l.ingredient_code ORDER BY reviewed_at DESC LIMIT 1),REPLACE(l.ingredient_code,'-',' ')) AS ingredient_label,c.status,c.expires_at,c.reviewed_at
 FROM team_accounts t JOIN proof_organizations o ON o.team_id=t.id JOIN proof_lots l ON l.supplier_id=o.id LEFT JOIN phone_supplier_catalog c ON c.account_id=t.id AND c.ingredient_code=l.ingredient_code WHERE t.kind='supplier' AND l.ingredient_code IS NOT NULL`;
const verifiedFrom=`FROM (${publicSuppliers}) c JOIN team_accounts t ON t.id=c.account_id WHERE c.ingredient_code=? AND c.account_id<>? AND ((?='all_verified' AND c.status='verified' AND c.expires_at>?) OR (? IN ('one','list') AND c.account_id IN (SELECT value FROM json_each(?))))`;

export async function phoneRequest(request,db,bucket,originalUser,permissions,env={},transport=fetch){
 if(!originalUser)return json({error:'Sign in to open requests.'},401);
 const actorId=originalUser.userId;
 try{
  const identity=await sourcingIdentity(db,originalUser,permissions),{user,p}=identity;
  const scope=user.userId,team=p.team,path=new URL(request.url).pathname,now=new Date().toISOString();
  const run=(sql,...args)=>db.prepare(sql).bind(...args);
  const audit=(id,org,action,subject,condition='1',args=[])=>run(`INSERT OR IGNORE INTO proof_audit (id,organization_id,action,subject_id,actor,created_at) SELECT ?,?,?,?,?,? WHERE ${condition}`,id,org,action,subject,actorId,now,...args);
  const catalog=async(code,after)=>{
   const ingredients=await rows(db,`SELECT ingredient_code,ingredient_label,COUNT(*) AS supplierCount,SUM(CASE WHEN status='verified' AND expires_at>? THEN 1 ELSE 0 END) AS verifiedCount FROM (${publicSuppliers}) GROUP BY ingredient_code,ingredient_label ORDER BY ingredient_label`,now);
   const suppliers=code?await rows(db,`SELECT c.account_id AS id,t.name,c.ingredient_code,c.ingredient_label,c.reviewed_at,c.expires_at,CASE WHEN c.status='verified' AND c.expires_at>? THEN 1 ELSE 0 END AS verified FROM (${publicSuppliers}) c JOIN team_accounts t ON t.id=c.account_id WHERE c.ingredient_code=?${after?' AND c.account_id>?':''} ORDER BY c.account_id LIMIT 51`,now,code,...(after?[after]:[])):[];
   return {ingredients,suppliers:suppliers.slice(0,50),nextAfter:suppliers.length>50?suppliers[49].id:null};
  };
  const currentSupplier=async(supplier,ingredient,verifiedOnly)=>!!await run(`SELECT 1 FROM (${publicSuppliers}) c WHERE c.account_id=? AND c.ingredient_code=? AND (?=0 OR c.status='verified' AND c.expires_at>?)`,supplier,ingredient,verifiedOnly?1:0,now).first();
  const ownedRequest=async id=>{
   const row=await run('SELECT r.*,t.name AS buyer_name FROM phone_requests r JOIN team_accounts t ON t.id=r.buyer_account_id WHERE r.id=? AND (r.buyer_account_id=? OR EXISTS (SELECT 1 FROM phone_request_recipients x WHERE x.request_id=r.id AND x.supplier_account_id=?))',id,scope,scope).first();
   if(!row)throw new RequestError('Request not found.',404);return row;
  };
  const inventory=async(row,supplier)=>row.status==='open'&&await currentSupplier(supplier,row.ingredient_code,row.target_mode==='all_verified')?recordsOnFile(db,{supplierId:supplier,buyerId:row.buyer_account_id,ingredient:row.ingredient_code,items:parse(row.items_json)},env,transport):[];
  const detail=async row=>{
   const exchanges=await rows(db,`SELECT x.*,t.name AS supplier_name FROM phone_request_recipients x JOIN team_accounts t ON t.id=x.supplier_account_id WHERE x.request_id=?${row.buyer_account_id===scope?'':' AND x.supplier_account_id=?'} ORDER BY x.updated_at DESC,x.id`,row.id,...(row.buyer_account_id===scope?[]:[scope]));
   const answers=[];
   for(const exchange of exchanges){
    const active=row.status==='open'&&await currentSupplier(exchange.supplier_account_id,row.ingredient_code,row.target_mode==='all_verified');
    const files=exchange.status==='answered'&&active?await inventory(row,exchange.supplier_account_id):[];
    const refs=parse(exchange.asset_refs_json)||[];
    const attachments=refs.map(id=>files.find(item=>item.id===id)||{id,available:false,label:'Not provided. This record is no longer available for this request.'});
    answers.push({id:exchange.id,supplierId:exchange.supplier_account_id,supplierName:exchange.supplier_name,status:active?(row.buyer_account_id===scope&&exchange.status==='deferred'?'pending':exchange.status):'unavailable',version:exchange.version,reply:active&&exchange.status==='answered'?exchange.reply:null,attachments:exchange.status==='answered'?attachments:[],answeredBy:exchange.answered_by,answeredAt:exchange.answered_at,updatedAt:exchange.updated_at});
   }
   return {id:row.id,buyerId:row.buyer_account_id,buyerName:row.buyer_name,ingredientCode:row.ingredient_code,ingredientLabel:row.ingredient_label,items:parse(row.items_json),targetMode:row.buyer_account_id===scope?row.target_mode:undefined,targetCount:row.buyer_account_id===scope?row.target_count:1,status:row.status,version:row.version,answerRevision:row.buyer_account_id===scope?row.answer_revision:undefined,createdAt:row.created_at,createdBy:row.created_by,answers};
  };
  if(request.method==='GET'){
   if(!team)return json({error:'Choose an account you own or were invited to.'},403);
   if(path==='/api/requests/catalog'){const params=new URL(request.url).searchParams;return json({accountId:scope,...await catalog(params.has('ingredient')?ingredientCode(params.get('ingredient')):null,params.has('after')?accountId(params.get('after')):null)});}
   if(path==='/api/requests/waiting'){
    const tasks=[];
    if(team.kind==='supplier'){
     const pending=await rows(db,`SELECT x.version,x.updated_at,r.id,r.items_json,r.ingredient_label,t.name AS buyer_name FROM phone_request_recipients x JOIN phone_requests r ON r.id=x.request_id JOIN team_accounts t ON t.id=r.buyer_account_id JOIN (${publicSuppliers}) c ON c.account_id=x.supplier_account_id AND c.ingredient_code=r.ingredient_code WHERE x.supplier_account_id=? AND x.status='pending' AND r.status='open' AND (r.target_mode<>'all_verified' OR c.status='verified' AND c.expires_at>?) ORDER BY x.updated_at DESC,x.id LIMIT 50`,scope,now);
     for(const r of pending)tasks.push({source:'phone',kind:'phone-answer',roomId:'request:'+r.id,requestId:r.id,accountId:scope,version:r.version,updatedAt:r.updated_at,context:r.buyer_name+' · '+r.ingredient_label,title:'Answer '+r.buyer_name,detail:parse(r.items_json).join(', ')+' requested for '+r.ingredient_label+'.'});
    }else if(team.kind==='buyer'){
     const pending=await rows(db,"SELECT id,ingredient_label,answer_revision,updated_at FROM phone_requests WHERE buyer_account_id=? AND status='open' AND answer_revision>seen_answer_revision ORDER BY updated_at DESC,id LIMIT 50",scope);
     for(const r of pending)tasks.push({source:'phone',kind:'phone-review',roomId:'request:'+r.id,requestId:r.id,accountId:scope,answerRevision:r.answer_revision,updatedAt:r.updated_at,context:r.ingredient_label,title:'Review supplier answers',detail:'New answers are attached to your request.'});
    }
    return json({accountId:scope,readOnly:!!p.readOnly,tasks});
   }
   if(path==='/api/requests'){
    const cursor=new URL(request.url).searchParams.get('before'),parts=cursor?.split('|');if(cursor&&(cursor.length>100||parts.length!==2||!Number.isFinite(Date.parse(parts[0]))||!/^[a-f0-9-]{36}$/i.test(parts[1])))throw new RequestError('Invalid page cursor.');
    const list=await rows(db,`SELECT r.id,r.buyer_account_id,r.ingredient_code,r.ingredient_label,r.items_json,r.target_count,r.status,r.created_at,r.updated_at,t.name AS buyer_name,
     (SELECT COUNT(*) FROM phone_request_recipients x WHERE x.request_id=r.id AND x.status='answered' AND (r.buyer_account_id=? OR x.supplier_account_id=?)) AS answered
     FROM phone_requests r JOIN team_accounts t ON t.id=r.buyer_account_id WHERE (r.buyer_account_id=? OR EXISTS (SELECT 1 FROM phone_request_recipients x WHERE x.request_id=r.id AND x.supplier_account_id=?))${cursor?' AND (r.updated_at<? OR r.updated_at=? AND r.id<?)':''} ORDER BY r.updated_at DESC,r.id DESC LIMIT 51`,scope,scope,scope,scope,...(cursor?[parts[0],parts[0],parts[1]]:[]));
    return json({accountId:scope,kind:team.kind,readOnly:!!p.readOnly,requests:list.slice(0,50).map(r=>({id:r.id,buyerId:r.buyer_account_id,buyerName:r.buyer_name,ingredientCode:r.ingredient_code,ingredientLabel:r.ingredient_label,items:parse(r.items_json),targetCount:r.buyer_account_id===scope?r.target_count:1,answered:r.answered,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at})),nextBefore:list.length>50?list[49].updated_at+'|'+list[49].id:null});
   }
   const match=path.match(/^\/api\/requests\/([a-f0-9-]{36})(\/on-file)?$/i);
   if(!match)return json({error:'Not found.'},404);
   const row=await ownedRequest(match[1]);
   if(match[2]){if(team.kind!=='supplier'||!await run('SELECT 1 FROM phone_request_recipients WHERE request_id=? AND supplier_account_id=?',row.id,scope).first())throw new RequestError('Request not found.',404);return json({accountId:scope,records:await inventory(row,scope)});}
   return json({accountId:scope,kind:team.kind,readOnly:!!p.readOnly,request:await detail(row)});
  }
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new RequestError('Same-origin request required.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new RequestError('JSON required.',415);
  if(p.readOnly)throw new RequestError('This account is view-only.',403);
  if(!await takeBudget(db,'phone-request-account',scope,120,60000))throw new RequestError('Account request limit reached. Try again shortly.',429);
  let body;try{body=JSON.parse(await boundedText(request,60000));}catch{throw new RequestError('Invalid request body.');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new RequestError('Invalid request body.');
  if(body.accountId!==scope)throw new RequestError('Your active account changed. Refresh before saving.',409);
  if(path==='/api/requests/catalog/review'){
   if(!p.owner)throw new RequestError('Operator review required.',403);
   const supplier=accountId(body.supplierId),code=ingredientCode(body.ingredientCode),revision=version(body.version);
   const target=await run("SELECT id FROM team_accounts WHERE id=? AND kind='supplier'",supplier).first();if(!target)throw new RequestError('Supplier account not found.',404);
   if(body.status==='verified'&&!await run(`SELECT 1 FROM (${publicSuppliers}) WHERE account_id=? AND ingredient_code=?`,supplier,code).first())throw new RequestError('Register the public supplier and exact ingredient lot first.');
   const prior=await run('SELECT * FROM phone_supplier_catalog WHERE account_id=? AND ingredient_code=?',supplier,code).first();
   if(!['verified','withdrawn'].includes(body.status))throw new RequestError('Choose a review decision.');
   if(body.status==='withdrawn'&&!prior)throw new RequestError('Catalog record not found.',404);
   if(revision!==(prior?.revision??0))throw new RequestError('Catalog review changed. Refresh before saving.',409);
   const label=body.status==='withdrawn'?prior.ingredient_label:text(body.ingredientLabel,'ingredient name',160),reference=text(body.reviewReference,'review reference',1000);
   if(reference.length<20)throw new RequestError('Record the identity and ingredient review evidence.');
   const canonical=await run('SELECT ingredient_label FROM phone_supplier_catalog WHERE ingredient_code=? LIMIT 1',code).first();if(canonical&&canonical.ingredient_label!==label)throw new RequestError('Use the established name for this exact ingredient code.',409);
   const expires=body.status==='withdrawn'?prior.expires_at:body.expiresAt;
   if(!Number.isFinite(Date.parse(expires))||body.status==='verified'&&(Date.parse(expires)<=Date.now()||Date.parse(expires)>Date.now()+366*86400000))throw new RequestError('Choose a review expiry within the next year.');
   const saved=await db.batch([run(`INSERT INTO phone_supplier_catalog (account_id,ingredient_code,ingredient_label,status,reviewed_by,review_reference,reviewed_at,expires_at,revision) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,ingredient_code) DO UPDATE SET status=excluded.status,reviewed_by=excluded.reviewed_by,review_reference=excluded.review_reference,reviewed_at=excluded.reviewed_at,expires_at=excluded.expires_at,revision=excluded.revision WHERE phone_supplier_catalog.revision=?`,supplier,code,label,body.status,actorId,reference,now,expires,revision+1,revision),audit('phone-catalog:'+supplier+':'+code+':'+(revision+1),supplier,'phone.catalog_'+body.status,code,'EXISTS (SELECT 1 FROM phone_supplier_catalog WHERE account_id=? AND ingredient_code=? AND revision=?)',[supplier,code,revision+1])]);
   if(!saved[0].meta.changes)throw new RequestError('Catalog review changed. Refresh before saving.',409);return json({ok:true,version:revision+1});
  }
  if(path==='/api/requests/on-file/review'){
   if(!p.owner)throw new RequestError('Operator document review required.',403);
   const payload=digitizedInput(body),submission=await run("SELECT s.* FROM supplier_submissions s JOIN team_accounts t ON t.id=s.owner_id WHERE s.id=? AND s.status='Reviewed' AND t.kind='supplier'",text(body.submissionId,'source submission',120)).first();
   if(!submission)throw new RequestError('Reviewed supplier source not found.',404);
   const source=parse(submission.body);if(payload.product!==source?.product||payload.lot!==source?.lot)throw new RequestError('Digitized product and lot must match the existing source.');
   if(!await run('SELECT 1 FROM proof_lots l JOIN proof_organizations o ON o.id=l.supplier_id WHERE o.team_id=? AND l.supplier_lot_id=? AND l.ingredient_code=?',submission.owner_id,payload.lot,payload.ingredientCode).first())throw new RequestError('The source lot and exact ingredient must be registered first.');
   const file=await bucket?.get(submission.file_key);if(!file)throw new RequestError('Original source unavailable.',409);const bytes=await file.arrayBuffer();if(bytes.byteLength>10000000)throw new RequestError('Source is too large.',413);
   const digest=await crypto.subtle.digest('SHA-256',bytes),sourceHash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');if(body.sourceHash!==sourceHash)throw new RequestError('Source fingerprint changed. Review the exact filed source.',409);
   const reference=text(body.reviewReference,'extraction review reference',1000);if(reference.length<20)throw new RequestError('Record the source extraction review.');
   const revision=version(body.version),prior=await run('SELECT * FROM phone_document_records WHERE submission_id=? AND kind=?',submission.id,body.kind).first();if(revision!==(prior?.version??0))throw new RequestError('Digitized record changed.',409);
   const id=prior?.id||crypto.randomUUID(),recordHash=await fingerprint([body.kind,sourceHash,payload]);
   const result=await db.batch([run(`INSERT INTO phone_document_records (id,submission_id,owner_account_id,kind,ingredient_code,payload_json,source_file_key,source_hash,record_fingerprint,status,version,reviewed_by,review_reference,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?,'active',?,?,?,?) ON CONFLICT(submission_id,kind) DO UPDATE SET ingredient_code=excluded.ingredient_code,payload_json=excluded.payload_json,source_file_key=excluded.source_file_key,source_hash=excluded.source_hash,record_fingerprint=excluded.record_fingerprint,status='active',version=excluded.version,reviewed_by=excluded.reviewed_by,review_reference=excluded.review_reference,reviewed_at=excluded.reviewed_at WHERE phone_document_records.version=?`,id,submission.id,submission.owner_id,body.kind,payload.ingredientCode,JSON.stringify(payload),submission.file_key,sourceHash,recordHash,revision+1,actorId,reference,now,revision),audit('phone-document:'+id+':'+(revision+1),submission.owner_id,'phone.document_reviewed',id,'EXISTS (SELECT 1 FROM phone_document_records WHERE id=? AND version=?)',[id,revision+1])]);
   if(!result[0].meta.changes)throw new RequestError('Digitized record changed.',409);return json({ok:true,id,version:revision+1});
  }
  const documentWithdrawal=path.match(/^\/api\/requests\/on-file\/([a-f0-9-]{36})\/withdraw$/i);
  if(documentWithdrawal){
   if(team?.kind!=='supplier')throw new RequestError('Use the source supplier account.',403);
   const revision=version(body.version),id=documentWithdrawal[1];
   const result=await db.batch([run("UPDATE phone_document_records SET status='withdrawn',version=version+1 WHERE id=? AND owner_account_id=? AND version=? AND status='active'",id,scope,revision),audit('phone-document:'+id+':'+(revision+1),scope,'phone.document_withdrawn',id,'EXISTS (SELECT 1 FROM phone_document_records WHERE id=? AND owner_account_id=? AND version=? AND status=?)',[id,scope,revision+1,'withdrawn'])]);
   if(!result[0].meta.changes)throw new RequestError('Source record changed or is unavailable.',409);return json({ok:true,version:revision+1});
  }
  if(!team)throw new RequestError('Choose an account you own or were invited to.',403);
  if(path==='/api/requests'){
   if(team.kind!=='buyer')throw new RequestError('Use a brand account to create a request.',403);
   const input=requestInput(body),hash=await fingerprint(input);
   const prior=await run('SELECT body_hash,target_count FROM phone_requests WHERE id=? AND buyer_account_id=?',input.id,scope).first();
   if(prior){if(prior.body_hash!==hash)throw new RequestError('That request was already saved. Open your requests before sending another.',409);return json({ok:true,id:input.id,recipientCount:prior.target_count,duplicate:true});}
   const args=[input.ingredientCode,scope,input.targetMode,now,input.targetMode,JSON.stringify(input.targets)];
   const eligible=await rows(db,`SELECT c.account_id,c.ingredient_label ${verifiedFrom}`, ...args);
   if(!eligible.length||input.targetMode!=='all_verified'&&eligible.length!==input.targets.length)throw new RequestError('Choose available suppliers for this exact ingredient; broadcasts require current verification.',409);
   const count=`(SELECT COUNT(*) ${verifiedFrom})`;
   const result=await db.batch([
    run(`INSERT OR IGNORE INTO phone_requests (id,buyer_account_id,ingredient_code,ingredient_label,items_json,target_mode,selected_ids_json,body_hash,fanout_done,target_count,status,version,created_by,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,0,${count},'open',0,?,?,? WHERE ${count}>0 AND (?='all_verified' OR ${count}=?)`,input.id,scope,input.ingredientCode,eligible[0].ingredient_label,JSON.stringify(input.items),input.targetMode,JSON.stringify(input.targets),hash,...args,actorId,now,now,...args,input.targetMode,...args,input.targets.length),
    run(`INSERT OR IGNORE INTO phone_request_recipients (id,request_id,supplier_account_id,status,reply,asset_refs_json,version,answered_by,answered_at,created_at,updated_at) SELECT ?||':'||c.account_id,?,c.account_id,'pending',NULL,'[]',0,NULL,NULL,?,? ${verifiedFrom} AND EXISTS (SELECT 1 FROM phone_requests r WHERE r.id=? AND r.buyer_account_id=? AND r.body_hash=? AND r.fanout_done=0)`,input.id,input.id,now,now,...args,input.id,scope,hash),
    run('UPDATE phone_requests SET fanout_done=1 WHERE id=? AND buyer_account_id=? AND body_hash=? AND fanout_done=0',input.id,scope,hash),
    audit('phone-create:'+input.id,scope,'phone.request_created',input.id,'EXISTS (SELECT 1 FROM phone_requests WHERE id=? AND buyer_account_id=? AND body_hash=? AND fanout_done=1)',[input.id,scope,hash]),
    run(`INSERT OR IGNORE INTO sourcing_notifications (id,email,account_id,message,href,read,delivery,attempts,next_attempt,created_at) SELECT 'phone-request:'||x.id,t.contact_email,x.supplier_account_id,'A sourcing request is waiting for your answer.','/requests/'||x.request_id,0,'in_app',0,0,? FROM phone_request_recipients x JOIN team_accounts t ON t.id=x.supplier_account_id JOIN phone_requests r ON r.id=x.request_id WHERE r.id=? AND r.buyer_account_id=? AND r.body_hash=?`,now,input.id,scope,hash),
   ]);
   const saved=await run('SELECT target_count,body_hash FROM phone_requests WHERE id=? AND buyer_account_id=?',input.id,scope).first();if(!saved||saved.body_hash!==hash)throw new RequestError('Request changed or recipients are no longer available.',409);
   return json({ok:true,id:input.id,recipientCount:saved.target_count,duplicate:!result[0].meta.changes},result[0].meta.changes?201:200);
  }
  const match=path.match(/^\/api\/requests\/([a-f0-9-]{36})\/(answer|withdraw|withdraw-answer|not-now|read)$/i);
  if(!match)throw new RequestError('Not found.',404);
  const row=await ownedRequest(match[1]);
  if(match[2]==='read'){
   if(team.kind!=='buyer'||row.buyer_account_id!==scope)throw new RequestError('Request not found.',404);
   const revision=version(body.revision);
   const result=await db.batch([run('UPDATE phone_requests SET seen_answer_revision=? WHERE id=? AND buyer_account_id=? AND answer_revision=?',revision,row.id,scope,revision),audit('phone-read:'+row.id+':'+revision,scope,'phone.answers_seen',row.id,'EXISTS (SELECT 1 FROM phone_requests WHERE id=? AND buyer_account_id=? AND answer_revision=? AND seen_answer_revision=?)',[row.id,scope,revision,revision])]);
   if(!result[0].meta.changes)throw new RequestError('A new answer arrived. Refresh to see it.',409);return json({ok:true});
  }
  if(match[2]==='withdraw'){
   if(team.kind!=='buyer'||row.buyer_account_id!==scope)throw new RequestError('Request not found.',404);
   const revision=version(body.version),next=revision+1;
   const result=await db.batch([run("UPDATE phone_requests SET status='withdrawn',version=version+1,updated_at=? WHERE id=? AND buyer_account_id=? AND version=? AND status='open'",now,row.id,scope,revision),audit('phone-withdraw:'+row.id+':'+next,scope,'phone.request_withdrawn',row.id,'EXISTS (SELECT 1 FROM phone_requests WHERE id=? AND version=? AND status=?)',[row.id,next,'withdrawn'])]);
   if(!result[0].meta.changes)throw new RequestError('Request changed. Refresh before saving.',409);return json({ok:true});
  }
  if(team.kind!=='supplier')throw new RequestError('Use the requested supplier account.',403);
  const exchange=await run('SELECT * FROM phone_request_recipients WHERE request_id=? AND supplier_account_id=?',row.id,scope).first();if(!exchange)throw new RequestError('Request not found.',404);
  if(match[2]==='not-now'){
   const revision=version(body.version),next=revision+1,mutation=crypto.randomUUID();
   const result=await db.batch([run("UPDATE phone_request_recipients SET status='deferred',version=version+1,last_mutation_id=?,updated_at=? WHERE id=? AND version=? AND status IN ('pending','deferred') AND EXISTS (SELECT 1 FROM phone_requests WHERE id=? AND status='open')",mutation,now,exchange.id,revision,row.id),audit('phone-answer:'+exchange.id+':'+next,scope,'phone.answer_deferred',row.id,'EXISTS (SELECT 1 FROM phone_request_recipients WHERE id=? AND version=? AND status=? AND last_mutation_id=?)',[exchange.id,next,'deferred',mutation])]);
   if(!result[0].meta.changes)throw new RequestError('Request changed. Refresh before saving.',409);return json({ok:true,version:next});
  }
  let input,status;
  if(match[2]==='answer'){
   input=answerInput(body);status='answered';
   const files=await inventory(row,scope);if(input.assetRefs.some(id=>!files.some(file=>file.id===id)))throw new RequestError('A source or its sharing scope changed. Refresh records on file.',409);
  }else {input={version:version(body.version),reply:null,assetRefs:[]};status='withdrawn';}
  const next=input.version+1,mutation=crypto.randomUUID();
  const result=await db.batch([
   run(`UPDATE phone_request_recipients SET status=?,reply=?,asset_refs_json=?,version=version+1,answered_by=?,answered_at=?,updated_at=?,last_mutation_id=? WHERE id=? AND version=? AND EXISTS (SELECT 1 FROM phone_requests WHERE id=? AND status='open') AND EXISTS (SELECT 1 FROM (${publicSuppliers}) c WHERE c.account_id=? AND c.ingredient_code=? AND (?=0 OR c.status='verified' AND c.expires_at>?))`,status,input.reply,JSON.stringify(input.assetRefs),actorId,now,now,mutation,exchange.id,input.version,row.id,scope,row.ingredient_code,row.target_mode==='all_verified'?1:0,now),
   audit('phone-answer:'+exchange.id+':'+next,scope,'phone.answer_'+status,row.id,'EXISTS (SELECT 1 FROM phone_request_recipients WHERE id=? AND version=? AND answered_by=? AND last_mutation_id=?)',[exchange.id,next,actorId,mutation]),
   run('UPDATE phone_requests SET updated_at=?,answer_revision=answer_revision+1 WHERE id=? AND EXISTS (SELECT 1 FROM phone_request_recipients WHERE id=? AND version=? AND answered_by=? AND last_mutation_id=?)',now,row.id,exchange.id,next,actorId,mutation),
  ]);
  if(!result[0].meta.changes)throw new RequestError('Request or answer changed. Refresh before saving.',409);
  return json({ok:true,version:next});
 }catch(error){return json({error:error instanceof RequestError?error.message:'Unable to complete this request. Refresh and try again.'},error instanceof RequestError?error.status:503);}
}
