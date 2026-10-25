const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
const json=(data,status=200)=>Response.json(data,{status,headers});
const emailValue=v=>{const s=String(v||'').trim().toLowerCase();if(s.length>254||!/^[^\s@<>]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(s))throw Error('Enter a valid email.');return s;};
const ranks={viewer:1,editor:2,admin:3,owner:4};
// Explicit account assignments requested by the site owner, not email-domain inference.
// Operational initialization is separate from schema migrations and never changes an existing account.
export async function ensureKasTeam(db){
 // Karen controls both sides of the authorized Kasandrinos pilot; records remain separate.
 await db.prepare('INSERT OR IGNORE INTO team_accounts (id,name,kind,owner_email,contact_email,created_at) VALUES (?,?,?,?,?,?)').bind('karen-buyer-team','Karen · Buyer pilot','buyer','karen@paleofoundation.com','karen@paleofoundation.com',new Date().toISOString()).run();
 await db.prepare('INSERT OR IGNORE INTO team_accounts (id,name,kind,owner_email,contact_email,supplier_key,created_at) VALUES (?,?,?,?,?,?,?)').bind('kasandrinos-team','Kasandrinos','supplier','karen@paleofoundation.com','karen@paleofoundation.com','kasandrinos',new Date().toISOString()).run();
 // Insert the founding membership only once, in the same batch as its marker. Revoked members stay revoked.
 await db.batch([db.prepare("INSERT OR IGNORE INTO team_members (id,team_id,email,role,source) SELECT 'kasandrinos-tony','kasandrinos-team','tony@kasandrinos.com','admin','invited' WHERE NOT EXISTS (SELECT 1 FROM team_selections WHERE user_id='kasandrinos-initialized')"),db.prepare("INSERT OR IGNORE INTO team_selections (user_id,team_id) VALUES ('kasandrinos-initialized',NULL)")]);
}
export async function teamRole(db,team,user){
 if(!user)return null;
 const email=user.email.toLowerCase();if(team.owner_email===email)return 'owner';
 const m=await db.prepare('SELECT role,source FROM team_members WHERE team_id=? AND email=?').bind(team.id,email).first();
 if(m?.source==='invited')return ranks[m.role]?m.role:null;
 return null;
}
export async function selectedTeam(db,user){
 if(!user)return null;
 await ensureKasTeam(db);
 const selected=await db.prepare('SELECT t.* FROM team_accounts t JOIN team_selections s ON s.team_id=t.id WHERE s.user_id=?').bind(user.userId).first();
 if(selected){const role=await teamRole(db,selected,user);if(role)return {...selected,role};}
 return null;
}
export async function sourcingIdentity(db,user,p){
 const team=await selectedTeam(db,user);if(!team)return {user,p,team:null};
 return {user:{...user,actorUserId:user.userId,teamId:team.id,supplierEmail:team.kind==='supplier'?team.contact_email:'buyer-account:'+team.id,userId:team.id,email:team.contact_email,displayName:team.name},p:{...p,buyer:team.kind==='buyer',team,readOnly:team.role==='viewer'},team};
}
export async function canEditKas(db,user){
 if(!user)return false;await ensureKasTeam(db);const team=await db.prepare("SELECT * FROM team_accounts WHERE id='kasandrinos-team'").first();return (ranks[await teamRole(db,team,user)]||0)>=2;
}
export async function recipientEmail(db,userId){const row=await db.prepare('SELECT email FROM auth_user WHERE id=? UNION ALL SELECT contact_email AS email FROM team_accounts WHERE id=? LIMIT 1').bind(userId,userId).first();return row?.email;}
export async function teamRequest(request,db,user){
 if(!user)return json({error:'Sign in to manage your accounts.'},401);
 await ensureKasTeam(db);const email=user.email.toLowerCase();
 try{
 const rows=(await db.prepare("SELECT DISTINCT t.* FROM team_accounts t LEFT JOIN team_members m ON m.team_id=t.id WHERE t.owner_email=? OR (m.email=? AND m.source='invited')").bind(email,email).all()).results;
 const teams=[];for(const t of rows){const role=await teamRole(db,t,user);if(role)teams.push({...t,role});}
 const selected=await selectedTeam(db,user);
 if(request.method==='GET'){
  const members=selected&&(ranks[selected.role]||0)>=3?(await db.prepare('SELECT id,email,role,source FROM team_members WHERE team_id=?').bind(selected.id).all()).results:[];
  const domains=selected&&(ranks[selected.role]||0)>=3?(await db.prepare('SELECT id,domain,role FROM team_domains WHERE team_id=?').bind(selected.id).all()).results:[];
  return json({teams,selected,members,domains,email});
 }
 if(request.method!=='POST'||request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Same-origin POST required.'},403);
 const raw=await request.text();if(raw.length>5000)throw Error('Request too large.');const d=JSON.parse(raw);
 if(d.action==='select'){
  if(d.id&&!teams.some(t=>t.id===d.id))throw Error('Account unavailable.');
  await db.prepare('INSERT INTO team_selections (user_id,team_id) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET team_id=excluded.team_id').bind(user.userId,d.id||null).run();return json({ok:true});
 }
 if(d.action==='create'){
  const name=String(d.name||'').trim().slice(0,120);if(!name||!['buyer','supplier'].includes(d.kind))throw Error('Name the account and select buyer or supplier.');
  const id=crypto.randomUUID();if(d.kind==='supplier'&&!['Olive oil','Cocoa','Tea and matcha','Protein','Spices','Rice'].includes(d.category))throw Error('Choose the supplier category.');await db.batch([db.prepare('INSERT INTO team_accounts (id,name,kind,owner_email,contact_email,created_at) VALUES (?,?,?,?,?,?)').bind(id,name,d.kind,email,email,new Date().toISOString()),db.prepare('INSERT INTO team_selections (user_id,team_id) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET team_id=excluded.team_id').bind(user.userId,id),db.prepare('INSERT INTO review_sessions (user_id,state) VALUES (?,?)').bind(id,JSON.stringify(d.kind==='supplier'?{supplierProfile:{id:'account-'+id,name,category:d.category,initials:name.slice(0,2)}}:{}))]);return json({ok:true});
 }
 if(d.teamId!==selected?.id)return json({error:'Your active account changed. Refresh before changing permissions.'},409);
 if(!selected||(ranks[selected.role]||0)<3)return json({error:'Account owner or administrator permission required.'},403);
 if(d.action==='member'){
  const target=emailValue(d.email);if(target===selected.owner_email)throw Error('The owner role cannot be changed here.');
  if(!['viewer','editor','admin'].includes(d.role))throw Error('Choose a valid permission.');if(d.role==='admin'&&selected.role!=='owner')throw Error('Only the owner can appoint an administrator.');
  const existing=await db.prepare('SELECT role FROM team_members WHERE team_id=? AND email=?').bind(selected.id,target).first();if(existing?.role==='admin'&&selected.role!=='owner')throw Error('Only the owner can change an administrator.');
  await db.prepare("INSERT INTO team_members (id,team_id,email,role,source) VALUES (?,?,?,?,'invited') ON CONFLICT(id) DO UPDATE SET role=excluded.role,source='invited'").bind(selected.id+':'+target,selected.id,target,d.role).run();
  // Normalize the historical founding row to prevent duplicate permissions.
  if(selected.id==='kasandrinos-team'&&target==='tony@kasandrinos.com')await db.prepare("DELETE FROM team_members WHERE id='kasandrinos-tony'").run();
  return json({ok:true});
 }
 if(d.action==='remove-member'){
  const existing=await db.prepare('SELECT * FROM team_members WHERE id=? AND team_id=?').bind(d.id,selected.id).first();if(!existing)throw Error('Member not found.');if(existing.role==='admin'&&selected.role!=='owner')throw Error('Only the owner can remove an administrator.');
  // An explicit deny prevents rejoining through a still-enabled domain policy.
  await db.prepare("UPDATE team_members SET role='revoked',source='invited' WHERE id=? AND team_id=?").bind(d.id,selected.id).run();return json({ok:true});
 }
 if(d.action==='domain'){
  if(selected.role!=='owner')throw Error('Only the account owner can manage domain suggestions.');
  const allowed=String(d.domain||'').trim().toLowerCase().replace(/^@/,'');if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(allowed)||['gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','proton.me','mail.com','example.com'].includes(allowed))throw Error('Use an exact company domain, not a public email provider.');
  if(!['viewer','editor'].includes(d.role))throw Error('Choose a suggested viewer or editor role.');
  await db.prepare('INSERT INTO team_domains (id,team_id,domain,role) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET role=excluded.role').bind(selected.id+':'+allowed,selected.id,allowed,d.role).run();return json({ok:true});
 }
 if(d.action==='remove-domain'){if(selected.role!=='owner')throw Error('Only the owner can change domain suggestions.');await db.prepare('DELETE FROM team_domains WHERE id=? AND team_id=?').bind(d.id,selected.id).run();return json({ok:true});}
 return json({error:'Unknown account action.'},400);
 }catch(error){return json({error:error.message||'Unable to update account.'},400);}
}
