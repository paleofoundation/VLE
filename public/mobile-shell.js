// Presentation only. The active role comes from /api/bootstrap, never an email.
const tab=(label,href,icon)=>({label,href,icon});
export function tabsFor(role,signedIn){
 if(!signedIn)return [tab('Home','/','home'),tab('Find lots','/suppliers','search'),tab('Verify','https://tecrid.com/verify','check'),tab('Sign in','/email-sign-in','person'),tab('More',null,'more')];
 if(role==='brand')return [tab('Home','/brand','home'),tab('Find lots','/suppliers','search'),tab('Requests','/requests','chat'),tab('Messages','/deals','chat'),tab('Account','/team','person')];
 if(role==='supplier')return [tab('Home','/workspace','home'),tab('My lots','/workspace/documents','box'),tab('Requests','/requests','chat'),tab('Messages','/deals','chat'),tab('Account','/team','person')];
 return [tab('Home','/','home'),tab('Find lots','/suppliers','search'),tab('Alerts','/notifications','bell'),tab('More',null,'more')];
}
export function exploreGroups(role,signedIn){
 const getStarted=!signedIn?[tab('Sign in','/email-sign-in'),tab('For suppliers','/workspace'),tab('For brands','/brand')]:role==='supplier'?[tab('Supplier workspace','/workspace'),tab('Conversations','/deals')]:role==='brand'?[tab('Brand workspace','/brand'),tab('Conversations','/deals')]:[tab('Find lots','/suppliers')];
 return [
  {title:'Get started',items:getStarted},
  {title:'Understand',items:[tab('How it works','/how-it-works'),tab('Boundaries','/boundaries'),tab('FAQ','/faq'),tab('What a TECRID is','https://tecrid.com/what-is-a-tecrid')]},
  {title:'Trust',items:[tab('Certifications and TECRIDs','/resources'),...(signedIn&&['brand','supplier'].includes(role)?[tab('Organization proof','/proof')]:[]),tab('Sourcing boundaries','/boundaries')]},
  {title:'Account',items:signedIn?[tab('Profile, organization and team','/team')]:[tab('Sign in to your account','/email-sign-in')]},
 ];
}
const paths={home:'m3 10 9-7 9 7v10H3zM9 20v-7h6v7',search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',check:'m5 12 4 4L19 6',person:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',box:'m3 7 9-4 9 4-9 5-9-5zm0 0v10l9 4 9-4V7m-9 5v9',chat:'M21 11a9 8 0 0 1-9 8H6l-4 3 1-6a8 8 0 0 1-1-5 9 8 0 0 1 19 0Z',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',more:'M4 5h16M4 12h16M4 19h16'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
const destination=item=>`<a href="${item.href}" ${item.href.startsWith('/')?'data-nav':'target="_blank" rel="noopener noreferrer"'}>${item.label}<span aria-hidden="true">↗</span></a>`;
export function mobileShell(role,session,path){
 const tabs=tabsFor(role,session.signedIn);
 const isCurrent=item=>item.href===path||(item.label==='Home'&&path==='/')||(item.href==='/suppliers'&&/^\/(suppliers|lots)\//.test(path))||(item.href==='/requests'&&path.startsWith('/requests/'));
 const moreCurrent=!tabs.some(isCurrent);
 return `<header class="phone-header"><a class="logo" href="/" data-nav aria-label="VLE home">vle<span>.</span></a>${session.signedIn?'<a href="/team" data-nav class="phone-account">Account</a>':'<a href="/email-sign-in" data-nav class="phone-account">Sign in</a>'}</header>
 <nav class="phone-tabs" aria-label="Phone navigation" style="--tab-count:${tabs.length}">${tabs.map(item=>item.href?`<a href="${item.href}" ${item.href.startsWith('/')?'data-nav':'target="_blank" rel="noopener noreferrer"'} ${isCurrent(item)?'aria-current="page"':''}>${icon(item.icon)}<span>${item.label}</span></a>`:`<button type="button" data-explore-open aria-controls="mobile-explore" aria-expanded="false" ${moreCurrent?'class="current"':''}>${icon('more')}<span>More</span></button>`).join('')}</nav>
 <dialog id="mobile-explore" class="phone-explore" aria-labelledby="explore-title"><div class="explore-heading"><h2 id="explore-title">Explore VLE</h2><button type="button" data-explore-close aria-label="Close Explore VLE" autofocus>Close <span aria-hidden="true">×</span></button></div><div class="explore-scroll">${exploreGroups(role,session.signedIn).map(group=>`<section><h3>${group.title}</h3>${group.items.map(destination).join('')}</section>`).join('')}${session.signedIn?'<button class="explore-sign-out" data-action="sign-out">Sign out</button>':''}<p class="explore-install">On iPhone, use Share, then Add to Home Screen.</p></div></dialog>`;
}
export function closeExplore(doc=document){const sheet=doc.querySelector('#mobile-explore');if(sheet?.open)sheet.close();}
export function mountMobileShell(doc=document,win=window){
 let returnFocus=null;
 const sync=()=>{const open=!!doc.querySelector('#mobile-explore')?.open;doc.querySelector('[data-explore-open]')?.setAttribute('aria-expanded',String(open));doc.body.classList.toggle('explore-open',open);if(!open&&returnFocus?.isConnected)returnFocus.focus();};
 doc.addEventListener('click',event=>{
  const button=event.target.closest('[data-explore-open]');
  const sheet=doc.querySelector('#mobile-explore');
  if(button&&sheet){returnFocus=button;sheet.showModal();sync();return;}
  if(event.target.closest('[data-explore-close]'))closeExplore(doc);
  // A click on the native backdrop has coordinates outside the dialog itself.
  if(sheet?.open&&event.target===sheet){const r=sheet.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeExplore(doc);}
 });
 doc.addEventListener('close',event=>{if(event.target.id==='mobile-explore')sync();},true);
 const desktop=win.matchMedia?.('(min-width: 768px) and (display-mode: browser)');
 desktop?.addEventListener('change',event=>{if(event.matches)closeExplore(doc);});
}
export function mobileInformationPage(path){
 if(path==='/boundaries')return `<section class="panel"><span class="eyebrow">SOURCING BOUNDARIES</span><h1>Know what the evidence says.</h1><p>A source report is not a certification or a guarantee that a lot meets your targets. Supplier-reported values and buyer evaluations are distinct from authenticated laboratory evidence.</p><p>Certifications have their own issuer, scope and dates. A supplier certificate does not automatically certify every lot or a brand using it.</p><p>TEST TECRIDs are sandbox records. Production authentication is not connected. Missing results stay unknown.</p><p>Private sourcing notes stay in your account. A shared summary reaches category suppliers. Conversations are restricted to their participants. A soft hold is not a purchase contract; contract and payment happen off-platform.</p><a href="/how-it-works" data-nav class="button">How it works</a></section>`;
 if(path==='/faq')return `<section class="panel phone-faq"><span class="eyebrow">FAQ</span><h1>A few useful answers.</h1>${[
 ['Can I browse without signing in?','Yes. Browse supplier and lot metadata freely. Full COAs and commercial terms have separate sign-in requirements.'],
 ['Does a report mean a lot passes?','No. Read the specific lot, scope and dates. A buyer evaluation is separate from laboratory authentication and certification.'],
 ['Who sees my sourcing notes?','Your private notes stay in your account. Only the summary you explicitly share reaches suppliers.'],
 ['Where do I approve access to a TECRID?','Open the access request in TECRID. Opening an alert in VLE does not approve access.'],
 ].map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>`;
 return '';
}
