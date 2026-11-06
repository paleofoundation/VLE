import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './support/onboarding-db.mjs';
import {createSupplierApplication,verifySupplierApplication,reviewSupplier,requireApprovedSupplier,supplierApplicationRequest} from '../server/supplier-onboarding.js';
import {queuePage,admit,boundedRequest} from '../server/onboarding-common.js';
const admin={userId:'admin',email:'kmfp84@gmail.com'};
const input=(n)=>({companyName:'Supplier '+n,country:'Cyprus',ingredientCategories:['Olive oil'],contactEmail:'supplier'+n+'@lab.test'});
const user=n=>({userId:'user'+n,email:input(n).contactEmail});
test('all migrations apply; pending verification and admin approval gate publishing',async()=>{
 const db=database();try{
 const result=await createSupplierApplication(db,input(1),'1');assert.equal(result.status,'PENDING_REVIEW');assert.equal(result.canPublish,false);
 await assert.rejects(()=>requireApprovedSupplier(db,user(1)),{status:403});
 await assert.rejects(()=>reviewSupplier(db,admin,result.id,{decision:'approve',reviewNote:'Reviewed'}),{status:409});
 await assert.rejects(()=>verifySupplierApplication(db,null),{status:401});
 await assert.rejects(()=>verifySupplierApplication(db,user(2)),{status:404});
 const verified=await verifySupplierApplication(db,user(1));assert.equal(verified.emailVerified,true);assert.equal(verified.canPublish,false);
 await assert.rejects(()=>reviewSupplier(db,user(1),result.id,{decision:'approve',reviewNote:'self approval'}),{status:403});
 assert.equal((await reviewSupplier(db,admin,result.id,{decision:'approve',reviewNote:'Verified identity and company'})).status,'APPROVED');
 await requireApprovedSupplier(db,user(1));
 await db.prepare('INSERT INTO auth_user(id,name,email,email_verified,created_at,updated_at) VALUES (?,?,?,?,?,?)').bind('attacker','Other applicant','other@lab.test',1,1,1).run();
 await assert.rejects(()=>requireApprovedSupplier(db,{userId:'new-team',actorUserId:'attacker',email:user(1).email}),{status:403});
 const state=JSON.parse((await db.prepare('SELECT state FROM review_sessions WHERE user_id=?').bind(user(1).userId).first()).state);assert.equal(state.supplierProfile.name,input(1).companyName);
 await assert.rejects(()=>reviewSupplier(db,admin,result.id,{decision:'reject',reviewNote:'stale decision'}),{status:404});
 }finally{db.close();}
});
test('normalized company and email duplicates are rejected, including racing requests',async()=>{const db=database();try{
 await createSupplierApplication(db,input(1),'1');
 await assert.rejects(()=>createSupplierApplication(db,{...input(2),companyName:' SUPPLIER 1. '},'2'),{status:409});
 await assert.rejects(()=>createSupplierApplication(db,{...input(2),contactEmail:input(1).contactEmail.toUpperCase()},'3'),{status:409});
 const requests=await Promise.allSettled([createSupplierApplication(db,input(3),'4'),createSupplierApplication(db,input(3),'5')]);assert.equal(requests.filter(r=>r.status==='fulfilled').length,1);
 }finally{db.close();}});
test('1001-row queue uses bounded cursor pages without gaps on identical timestamps',async()=>{const db=database();try{
 for(let n=0;n<1001;n++)await db.prepare("INSERT INTO supplier_applications (id,company_name,normalized_name,country,ingredient_categories,contact_email,status,created_at) VALUES (?,?,?,?,?,?,'PENDING_REVIEW',?)").bind('supplier_'+crypto.randomUUID(),'Company '+n,'company'+n,'Cyprus','["Olive oil"]','queue'+n+'@lab.test','2026-11-06T00:00:00.000Z').run();
 let cursor=null,ids=[];do{const search=new URLSearchParams({status:'PENDING_REVIEW',...(cursor?{before:cursor}:{})});const page=await queuePage(db,'supplier_applications',search);assert(page.applications.length<=25);ids.push(...page.applications.map(r=>r.id));cursor=page.nextCursor;}while(cursor);
 assert.equal(ids.length,1001);assert.equal(new Set(ids).size,1001);
 await assert.rejects(()=>queuePage(db,'supplier_applications',new URLSearchParams({before:'bad'})),{status:400});
 const plan=await db.prepare("EXPLAIN QUERY PLAN SELECT * FROM supplier_applications WHERE status='PENDING_REVIEW' ORDER BY created_at DESC,id DESC LIMIT 26").all();assert(plan.results.some(r=>r.detail.includes('supplier_applications_queue')));
 }finally{db.close();}});
test('durable rate budget admits only the configured concurrent count; body is bounded',async()=>{const db=database();try{
 const r=await Promise.allSettled(Array.from({length:10},()=>admit(db,'test','same',3,1000,10000)));assert.equal(r.filter(x=>x.status==='fulfilled').length,3);await admit(db,'test','same',3,1000,11001);
 await assert.rejects(()=>boundedRequest(new Request('https://vle.test/api/supplier-applications',{method:'POST',body:'x'.repeat(9000)}),8192),{status:413});
 }finally{db.close();}});
test('public API saves PENDING_REVIEW; admin queue is private; test record can be removed',async()=>{const db=database();try{
 const request=(path,body)=>new Request('https://vle.test'+path,{method:'POST',headers:{origin:'https://vle.test','Content-Type':'application/json'},body:JSON.stringify(body)});
 const response=await supplierApplicationRequest(request('/api/supplier-applications',input(8)),db,null);assert.equal(response.status,201);const {application}=await response.json();
 assert.equal((await db.prepare('SELECT status FROM supplier_applications WHERE id=?').bind(application.id).first()).status,'PENDING_REVIEW');
 assert.equal((await supplierApplicationRequest(new Request('https://vle.test/api/admin/supplier-applications'),db,null)).status,403);
 const list=await supplierApplicationRequest(new Request('https://vle.test/api/admin/supplier-applications'),db,admin);assert.equal((await list.json()).applications.length,1);
 const deleted=await supplierApplicationRequest(new Request('https://vle.test/api/admin/supplier-applications/'+application.id,{method:'DELETE',headers:{origin:'https://vle.test'}}),db,admin);assert.equal(deleted.status,200);assert.equal(await db.prepare('SELECT id FROM supplier_applications WHERE id=?').bind(application.id).first(),null);
 const cross=await supplierApplicationRequest(new Request('https://vle.test/api/supplier-applications',{method:'POST',headers:{origin:'https://other.test','Content-Type':'application/json'},body:JSON.stringify(input(9))}),db,null);assert.equal(cross.status,403);
 }finally{db.close();}});
