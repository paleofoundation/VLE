const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let inbox=null,error='',loading=false,generation=0,answerId=null,notice='';
export function invalidateWaiting(){inbox=null;error='';generation++;answerId=null;}
export function waitingHome(data,role,{answer=null,notice:feedback=''}={}){
 const supplier=role==='supplier';
 return `<section class="waiting-home"><header><span class="eyebrow">${supplier?'SUPPLIER':'BRAND'} HOME</span><h1>Waiting on you</h1><p>One next step for each conversation.</p></header>${feedback?`<p role="status" class="waiting-feedback">${esc(feedback)}</p>`:''}<div class="waiting-list">${data.tasks.map(task=>{
  const attrs=`data-room="${esc(task.roomId)}" data-key="${esc(task.key)}" data-version="${task.version}"`;
  return `<article class="waiting-card"><span class="eyebrow">${esc(task.supplier)} · ${esc(task.lot)}</span><h2>${esc(task.title)}</h2><p>${esc(task.detail)}</p>${task.terms?`<details><summary>Read proposed responsibility</summary><dl><dt>Shipping</dt><dd>${esc(task.terms.shipping)}</dd><dt>Testing</dt><dd>${esc(task.terms.testing)}</dd></dl></details>`:''}${answer===task.roomId?`<blockquote>${esc(task.message)}</blockquote><form data-waiting-answer ${attrs}><label class="field"><span>Your answer</span><textarea name="message" required maxlength="3000" rows="3" autofocus></textarea></label><div class="waiting-actions"><button type="submit" class="orange">Send answer</button><button type="button" data-waiting-action="cancel">Cancel</button></div><p class="waiting-error" role="alert"></p></form>`:`<div class="waiting-actions"><button class="orange" data-waiting-action="${task.kind==='answer'?'open-answer':'approve'}" ${attrs} ${data.readOnly?'disabled':''}>${task.kind==='answer'?'Answer':'Approve'}</button><button data-waiting-action="not-now" ${attrs} ${data.readOnly?'disabled':''}>Not now</button></div><p class="waiting-error" role="alert"></p>`}</article>`;
 }).join('')||`<article class="waiting-empty"><span aria-hidden="true">✓</span><h2>You're all caught up</h2><p>${supplier?'Your buyer conversations will appear here when they need an answer.':'Your supplier conversations will appear here when they need an answer.'}</p><a href="${supplier?'/requests':'/requests/new'}" data-nav class="button">${supplier?'See requests':'Create a request'}</a></article>`}</div>${data.readOnly?'<p class="notice">You have view-only access. An editor on your account can answer or approve.</p>':''}<p class="waiting-boundary">These are sourcing decisions. Evidence access is approved in TECRID.</p></section>`;
}
export function waitingPage(role,rerender){
 if(!inbox){if(!loading&&!error){loading=true;const g=generation;fetch('/api/sourcing/waiting',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(g===generation)inbox=d;}).catch(e=>{if(g===generation)error=e.message;}).finally(()=>{loading=false;rerender();});}return `<section class="waiting-home"><h1>Waiting on you</h1><p role="status">${error?esc(error):'Loading your next steps...'}</p>${error?'<button data-waiting-action="retry">Try again</button>':''}</section>`;}
 return waitingHome(inbox,role,{answer:answerId,notice});
}
export function mountWaiting(rerender){
 const save=async(element,action,message)=>{
  const response=await fetch('/api/sourcing/waiting/'+encodeURIComponent(element.dataset.room)+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accountId:inbox?.accountId,key:element.dataset.key,version:Number(element.dataset.version),...(message===undefined?{}:{message})})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to save. Refresh and try again.');
  notice=action==='approve'?'Approval recorded.':action==='not-now'?'Set aside for now. A new update will bring it back.':'Your answer was saved.';invalidateWaiting();rerender();
 };
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-waiting-action]');if(!button)return;
  const action=button.dataset.waitingAction;
  if(action==='retry'){invalidateWaiting();rerender();return;}
  if(action==='cancel'){answerId=null;rerender();return;}
  if(action==='open-answer'){answerId=button.dataset.room;rerender();document.querySelector('[data-waiting-answer] textarea')?.focus();return;}
  button.disabled=true;try{await save(button,action);}catch(error){button.closest('article').querySelector('.waiting-error').textContent=error.message;}finally{button.disabled=false;}
 });
 document.addEventListener('submit',async event=>{
  const form=event.target;if(!form.matches('[data-waiting-answer]'))return;event.preventDefault();
  const button=form.querySelector('[type=submit]');button.disabled=true;
  try{await save(form,'answer',new FormData(form).get('message'));}catch(error){form.querySelector('.waiting-error').textContent=error.message;}finally{button.disabled=false;}
 });
}
