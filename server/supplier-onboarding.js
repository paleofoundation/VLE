import {OWNER_EMAIL} from './owner.ts';
import {OnboardingError,admit,clean,companyKey,contactEmail,queuePage,reply,sameOrigin,boundedRequest,errorResponse} from './onboarding-common.js';
import {initial} from './fixtures.js';
export function isSupplierAdmin(user,env={}){
 const email=user?.email?.toLowerCase();
 return !!email&&(email===OWNER_EMAIL||String(env.ICS_ADMIN_EMAILS||'').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean).includes(email));
}
export async function createSupplierApplication(db,input,ip){
 await admit(db,'supplier-ip',ip,5);
 const company=clean(input.companyName,180,'company name'),email=contactEmail(input.contactEmail),key=companyKey(company);
 const country=clean(input.country,100,'country');
 const categories=Array.isArray(input.ingredientCategories)?input.ingredientCategories:typeof input.ingredientCategories==='string'?input.ingredientCategories.split(','):[];
 if(!categories.length||categories.length>20)throw new OnboardingError('Enter between 1 and 20 ingredient categories.');
 const ingredientCategories=[...new Set(categories.map(c=>clean(c,100,'ingredient category')))];
 await admit(db,'supplier-email',email,3);
 if(await db.prepare('SELECT id FROM supplier_applications WHERE contact_email=? OR normalized_name=? LIMIT 1').bind(email,key).first())throw new OnboardingError('An application already exists for this email or company. Verify your email to view its status.',409);
 const id='supplier_'+crypto.randomUUID(),at=new Date().toISOString();
 try{await db.prepare(`INSERT INTO supplier_applications (id,company_name,normalized_name,country,ingredient_categories,contact_email,status,created_at) VALUES (?,?,?,?,?,?,'PENDING_REVIEW',?)`).bind(id,company,key,country,JSON.stringify(ingredientCategories),email,at).run();}
 catch(error){if(/UNIQUE constraint/i.test(String(error)))throw new OnboardingError('An application already exists for this email or company.',409);throw error;}
 return {id,status:'PENDING_REVIEW',emailVerified:false,canPublish:false};
}
export async function verifySupplierApplication(db,user){
 if(!user)throw new OnboardingError('Verify your contact email using the sign-in link first.',401);
 const result=await db.prepare("UPDATE supplier_applications SET verified_user_id=?,email_verified_at=COALESCE(email_verified_at,?) WHERE contact_email=? AND (verified_user_id IS NULL OR verified_user_id=?) RETURNING id,status,email_verified_at").bind(user.userId,new Date().toISOString(),user.email.toLowerCase(),user.userId).first();
 if(!result)throw new OnboardingError('No application exists for your verified email.',404);
 return {id:result.id,status:result.status,emailVerified:true,canPublish:result.status==='APPROVED'};
}
export async function requireApprovedSupplier(db,user,env={}){
 if(!user)throw new OnboardingError('Sign in required.',401);
 if(user.teamId==='kasandrinos-team')return; // selectedTeam already verified explicit pilot membership
 if(user.actorUserId){const actor=await db.prepare('SELECT id,email FROM auth_user WHERE id=? AND email_verified=1').bind(user.actorUserId).first();if(!actor)throw new OnboardingError('Verified account required.',401);user={...user,userId:actor.id,email:actor.email};}
 const application=await db.prepare('SELECT status,email_verified_at FROM supplier_applications WHERE verified_user_id=? OR contact_email=? LIMIT 1').bind(user.userId,user.email.toLowerCase()).first();
 if(application){if(application.status==='APPROVED'&&application.email_verified_at)return;throw new OnboardingError('Your supplier application must be verified and approved before publishing listings.',403);}
 if(user.email.toLowerCase()===OWNER_EMAIL)return;
 // Preserve the independently assigned existing supplier manager. Neither a
 // claimed domain nor a self-created supplier team grants this exception.
 const manager=await db.prepare("SELECT manager_email FROM supplier_storefronts WHERE supplier='kasandrinos'").first();
 const team=await db.prepare("SELECT contact_email FROM team_accounts WHERE id='kasandrinos-team'").first();
 if([manager?.manager_email,team?.contact_email].filter(Boolean).some(e=>e.toLowerCase()===user.email.toLowerCase()))return;
 throw new OnboardingError('Apply at /suppliers/new and complete admin review before publishing listings.',403);
}
export async function reviewSupplier(db,user,id,input,env={}){
 if(!isSupplierAdmin(user,env))throw new OnboardingError('Administrator access required.',403);
 const note=clean(input.reviewNote,1200,'review note');
 if(!['approve','reject'].includes(input.decision))throw new OnboardingError('Choose approve or reject.');
 const row=await db.prepare("SELECT * FROM supplier_applications WHERE id=? AND status='PENDING_REVIEW'").bind(id).first();
 if(!row)throw new OnboardingError('Pending application not found.',404);
 if(row.contact_email===user.email.toLowerCase())throw new OnboardingError('An applicant cannot review its own company.',403);
 if(input.decision==='approve'&&(!row.email_verified_at||!row.verified_user_id))throw new OnboardingError('The supplier must verify its contact email before approval.',409);
 const status=input.decision==='approve'?'APPROVED':'REJECTED',at=new Date().toISOString();
 const statements=[db.prepare("UPDATE supplier_applications SET status=?,reviewed_by=?,review_note=?,reviewed_at=? WHERE id=? AND status='PENDING_REVIEW'").bind(status,user.email.toLowerCase(),note,at,id)];
 if(status==='APPROVED'){
  const stored=await db.prepare('SELECT state FROM review_sessions WHERE user_id=?').bind(row.verified_user_id).first();
  const state=stored?JSON.parse(stored.state):initial();
  const profile={id:'account-'+row.verified_user_id,name:row.company_name,country:row.country,category:JSON.parse(row.ingredient_categories)[0],initials:row.company_name.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()};
  state.supplierProfile=profile;state.supplier=profile.id;state.role='supplier';
  // This is one atomic D1 batch, with an optimistic guard on the review row.
  statements.push(db.prepare(`INSERT INTO review_sessions (user_id,state,version) SELECT ?,?,0 WHERE EXISTS(SELECT 1 FROM supplier_applications WHERE id=? AND status='APPROVED' AND reviewed_at=?) ON CONFLICT(user_id) DO UPDATE SET state=json_set(review_sessions.state,'$.supplierProfile',json(?),'$.supplier',?,'$.role','supplier'),version=review_sessions.version+1`).bind(row.verified_user_id,JSON.stringify(state),id,at,JSON.stringify(profile),profile.id));
 }
 const result=await db.batch(statements);
 if(result[0].meta.changes!==1)throw new OnboardingError('Another administrator reviewed this application. Reload the queue.',409);
 return {id,status,canPublish:status==='APPROVED'};
}
export async function supplierApplicationRequest(request,db,user,env={}){
 try{
  const url=new URL(request.url),path=url.pathname;
  if(path.startsWith('/api/admin/')){
   if(!isSupplierAdmin(user,env))throw new OnboardingError('Administrator access required.',403);
   if(path==='/api/admin/supplier-applications'&&request.method==='GET')return reply(await queuePage(db,'supplier_applications',url.searchParams));
   const id=path.split('/').at(-1);if(!/^supplier_[a-f0-9-]{36}$/.test(id))throw new OnboardingError('Application not found.',404);
   sameOrigin(request);
   if(request.method==='POST'){const input=await (await boundedRequest(request,4096)).json();return reply({application:await reviewSupplier(db,user,id,input,env)});}
   if(request.method==='DELETE'){const result=await db.prepare("DELETE FROM supplier_applications WHERE id=? AND status='PENDING_REVIEW'").bind(id).run();if(result.meta.changes!==1)throw new OnboardingError('Pending application not found.',404);return reply({deleted:true});}
  }
  if(path==='/api/supplier-applications/me'&&request.method==='GET'){
   if(!user)throw new OnboardingError('Sign in required.',401);
   const application=await db.prepare('SELECT id,company_name,country,ingredient_categories,contact_email,status,email_verified_at FROM supplier_applications WHERE contact_email=?').bind(user.email.toLowerCase()).first();
   return reply({application});
  }
  if(request.method==='POST'){
   sameOrigin(request);
   await admit(db,'supplier-write-ip',request.headers.get('cf-connecting-ip')||'unknown',20);
   if(path==='/api/supplier-applications/verify')return reply({application:await verifySupplierApplication(db,user)});
   if(path==='/api/supplier-applications'){
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw new OnboardingError('JSON required.',415);
    const input=await (await boundedRequest(request,8192)).json();return reply({application:await createSupplierApplication(db,input,request.headers.get('cf-connecting-ip')||'unknown')},201);
   }
  }
  return reply({error:'Not found.'},404);
 }catch(error){return errorResponse(error);}
}
