const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentEmail=null,data=null,error='',pending=null,generation=0;
function content(){
 if(!currentEmail)return '';
 return `<section class="panel evidence-inbox" aria-label="TECRID and evidence notifications"><div class="section-heading"><div><span class="eyebrow">TECRID + VLE</span><h2>Your evidence updates</h2></div><button data-evidence-refresh>Refresh</button></div><p>New TECRIDs, requests to unlock digital cards, and access decisions. Opening an update does not approve access.</p>${error?`<p role="alert">${esc(error)}</p>`:''}${data?.unavailable?.length?`<p role="alert">${esc(data.unavailable.join(' and '))} could not be refreshed. Retry for the complete inbox.</p>`:''}${!data&&!error?'<p role="status">Loading evidence updates…</p>':''}${data?.items.map(item=>`<article class="evidence-notice ${item.read?'read':'unread'}"><div><span class="badge">${item.source==='tecrid'?'TECRID':'VLE · TEST card'}</span> ${!item.read?'<strong>Unread</strong>':''}<small>${esc(new Date(item.createdAt).toLocaleString())}</small></div><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p><div class="evidence-notice-actions"><a href="${esc(item.href)}">${item.kind.includes('requested')?'Review request':'Open update'} ↗</a>${!item.read?`<button data-evidence-read="${esc(item.id)}">Mark read</button>`:''}</div></article>`).join('')||(!data?.unavailable?.length&&data?'<p>No evidence updates yet.</p>':'')}<p class="fine">Read status is personal and shared with TECRID. Latest 100 updates per source; refreshes while the app is open.</p></section>`;
}
function paint(){const target=document.getElementById('evidence-inbox');if(target)target.innerHTML=content();for(const badge of document.querySelectorAll('[data-evidence-unread]')){const count=data?.unreadCount||0;badge.textContent=count>99?'99+':String(count);badge.hidden=!count;}}
async function refresh(){
 if(!currentEmail)return;pending?.abort();const controller=new AbortController();pending=controller;const g=generation;
 try{const response=await fetch('/api/evidence-notifications',{cache:'no-store',signal:controller.signal});if(response.status===401){if(g===generation){data=null;currentEmail=null;error='Sign in again to view your updates.';}return;}if(!response.ok)throw Error('Evidence updates are temporarily unavailable.');const result=await response.json();if(g===generation){data=result;error='';}}
 catch(e){if(!controller.signal.aborted&&g===generation)error=e.message;}
 finally{if(!controller.signal.aborted&&g===generation)paint();}
}
export function evidenceNotificationLink(session){
 const email=session?.signedIn?session.email:null;if(email!==currentEmail){generation++;pending?.abort();currentEmail=email;data=null;error='';if(email)queueMicrotask(refresh);}
 return email?`<a href="/notifications" data-nav class="text-link" aria-label="Evidence notifications">Alerts <span data-evidence-unread class="nav-count" ${data?.unreadCount?'':'hidden'}>${data?.unreadCount>99?'99+':data?.unreadCount||0}</span></a>`:'';
}
export function evidenceNotificationPanel(){return `<div id="evidence-inbox">${content()}</div>`;}
export function mountEvidenceNotifications(){
 setInterval(()=>{if(!document.hidden)void refresh();},45000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
 document.addEventListener('click',async event=>{const button=event.target.closest('[data-evidence-read],[data-evidence-refresh]');if(!button)return;button.disabled=true;if(button.hasAttribute('data-evidence-refresh')){await refresh();button.disabled=false;return;}
 try{const response=await fetch('/api/evidence-notifications',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'read',id:button.dataset.evidenceRead})});if(!response.ok)throw Error('Could not mark this update read. Refresh and retry.');await refresh();}catch(e){error=e.message;paint();}finally{button.disabled=false;}});
}
