import {teamRole} from './teams.js';
import {kasLots} from './kasandrinos.js';
export const stages=['Inquiry','Quote shared','Sample requested','Sample shipped','Evaluation recorded','Soft hold requested','Soft hold confirmed','Closed'];
export const milestones=['Define target','Find alternatives','Evaluate samples','Retest','Ready for purchasing'];
const categories=['Olive oil','Cocoa','Tea and matcha','Protein','Spices','Rice'];
const txt=(v,max=200)=>String(v??'').trim().slice(0,max);
export function briefInput(d){
 const b={ingredient:txt(d.ingredient),category:txt(d.category),quantity:Number(d.quantity),unit:txt(d.unit),destination:txt(d.destination),date:txt(d.date),certifications:txt(d.certifications,1000),application:txt(d.application,1000),notes:txt(d.notes,4000),progress:txt(d.progress)||milestones[0],limits:[0,1,2,3].map(i=>d['limit'+i]===''||d['limit'+i]==null?null:Number(d['limit'+i]))};
 if(!b.ingredient||!categories.includes(b.category)||!Number.isFinite(b.quantity)||b.quantity<=0||!['kg','L','tonnes','units'].includes(b.unit)||!b.destination||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Number.isFinite(Date.parse(b.date))||!milestones.includes(b.progress)||b.limits.some(v=>v!==null&&(!Number.isFinite(v)||v<0)))throw Error('Complete the ingredient, category, positive quantity, unit, destination and date. Limits must be non-negative numbers.');
 return b;
}
export function sharedBrief(b){const {notes,progress,...publicFields}=b;return publicFields;}
export function candidates(b){return kasLots.filter(l=>l.category===b.category).map(l=>({id:l.id,product:l.product,supplier:'Kasandrinos',packaging:l.packaging,fit:'Category match',gaps:['Numerical results await supplier confirmation','Stock quantity, MOQ and lead time unconfirmed',...(b.certifications?['Requested certifications need scope and validity review']:[])],evidence:'Original lot-linked reports available; target compliance not established'}));}
export function roomRole(room,user){return room.buyer_id===user.userId?'buyer':(room.supplier_account_id?room.supplier_account_id===user.teamId:room.supplier_email===(user.supplierEmail||user.email).toLowerCase())?'supplier':null;}
export function transitionRoom(room,role,d){
 const record=JSON.parse(room.record),stage=room.stage;
 const text=(k,max=1000)=>{const v=txt(d[k],max);if(!v)throw Error('Complete '+k+'.');return v;};
 const positive=k=>{const v=Number(d[k]);if(!Number.isFinite(v)||v<=0)throw Error('Enter a positive '+k+'.');return v;};
 const future=k=>{const v=text(k);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Date.parse(v+'T23:59:59Z')<Date.now())throw Error('Choose a current or future '+k+'.');return v;};
 let next;
 if(d.action==='quote'&&role==='supplier'&&['Inquiry','Quote shared'].includes(stage)){record.quote={price:positive('price'),currency:text('currency',3),unit:text('unit',20),moq:positive('moq'),lead:text('lead'),freight:text('freight'),valid:future('valid')};if(!/^[A-Z]{3}$/.test(record.quote.currency))throw Error('Use a three-letter currency code.');next='Quote shared';}
 else if(d.action==='sample'&&role==='buyer'&&stage==='Quote shared'){if(Date.parse(record.quote.valid+'T23:59:59Z')<Date.now())throw Error('Ask the supplier to refresh the expired quote.');record.sample={quantity:positive('quantity'),unit:text('unit',20),instructions:text('instructions')};next='Sample requested';}
 else if(d.action==='costs'&&['buyer','supplier'].includes(role)&&stage==='Sample requested'){record.costs={shipping:text('shipping'),testing:text('testing'),by:role,agreed:false};next=stage;}
 else if(d.action==='agree-costs'&&stage==='Sample requested'&&record.costs&&record.costs.by!==role){record.costs.agreed=true;next=stage;}
 else if(d.action==='ship'&&role==='supplier'&&stage==='Sample requested'){if(!record.costs?.agreed)throw Error('Both parties must agree on shipping and testing costs first.');record.shipment={carrier:text('carrier'),tracking:text('tracking'),lot:room.lot};next='Sample shipped';}
 else if(d.action==='evaluate'&&role==='buyer'&&['Sample shipped','Evaluation recorded'].includes(stage)){record.evaluation={outcome:text('outcome'),notes:text('evaluation',2000)};if(!['Approved for our application','Needs more evidence','Not suitable'].includes(record.evaluation.outcome))throw Error('Choose an evaluation outcome.');next='Evaluation recorded';}
 else if(d.action==='hold'&&role==='buyer'&&stage==='Evaluation recorded'){if(record.evaluation.outcome!=='Approved for our application')throw Error('Record your approval before requesting a hold.');record.hold={quantity:positive('quantity'),until:future('until')};next='Soft hold requested';}
 else if(d.action==='confirm-hold'&&role==='supplier'&&stage==='Soft hold requested'){if(Date.parse(record.hold.until+'T23:59:59Z')<Date.now())throw Error('This hold request has expired.');next='Soft hold confirmed';}
 else if(d.action==='close'&&stage!=='Closed')next='Closed';
 else throw Error('That action is not available at this stage for your account.');
 return {stage:next,record};
}
export async function deliverNotifications(db,env,transport=fetch){
 if(!env.RESEND_API_KEY||!env.VLE_EMAIL_FROM)return;
 const rows=(await db.prepare("SELECT n.* FROM sourcing_notifications n LEFT JOIN sourcing_preferences p ON p.email=COALESCE(n.account_id,n.email) WHERE n.delivery='pending' AND n.next_attempt<=? AND COALESCE(p.email_enabled,1)=1 ORDER BY n.created_at LIMIT 10").bind(Date.now()).all()).results;
 for(const n of rows){
  const locked=await db.prepare("UPDATE sourcing_notifications SET next_attempt=? WHERE id=? AND delivery='pending' AND next_attempt=?").bind(Date.now()+120000,n.id,n.next_attempt).run();if(!locked.meta.changes)continue;
  try{let recipients=[n.email];const teams=(await db.prepare('SELECT * FROM team_accounts WHERE id=?').bind(n.account_id||'').all()).results;for(const team of teams){const members=(await db.prepare('SELECT email FROM team_members WHERE team_id=?').bind(team.id).all()).results;for(const m of members)if(await teamRole(db,team,{email:m.email}))recipients.push(m.email);}recipients=[...new Set(recipients)];for(const recipient of recipients){const recipientHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(recipient.toLowerCase()))),b=>b.toString(16).padStart(2,'0')).join('');const r=await transport('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'vle-notice-'+n.id+'-'+recipientHash},signal:AbortSignal.timeout(12000),body:JSON.stringify({from:env.VLE_EMAIL_FROM,to:[recipient],subject:'An update in your VLE workspace',text:'There is a new sourcing update in your VLE workspace. Sign in to review it.\n\nhttps://vle.exchange'+n.href+'\n\nManage email notifications: https://vle.exchange/notifications'})});if(!r.ok)throw Error('delivery');}await db.prepare("UPDATE sourcing_notifications SET delivery='sent',attempts=attempts+1 WHERE id=?").bind(n.id).run();}
  catch{await db.prepare("UPDATE sourcing_notifications SET attempts=attempts+1,next_attempt=? WHERE id=?").bind(Date.now()+Math.min(3600000,60000*2**Math.min(n.attempts,6)),n.id).run();}
 }
}
