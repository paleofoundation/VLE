const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function reportReturnPath(value){return typeof value==='string'&&/^\/reports\/ll-(43295|43296|43297|43298|43299|43300|43301|43302)$/.test(value)?value:null;}
export function reportGate(path,catalog,session){
 const safe=reportReturnPath(path),report=safe&&catalog?.reports.find(r=>r.id===safe.split('/').at(-1)&&r.tecridTest?.sandbox);
 if(!report)return '<section class="panel"><h1>Card not found</h1></section>';
 return `<section class="panel"><span class="badge yellow">TEST ID · LIGHT LABS APPROVAL PENDING</span><h1>Digital TECRID card · ${esc(report.title)}</h1><p>Kasandrinos · ${esc(report.sample)} · Lot ${esc(report.lotNumbers.join(' / '))} · Source report ${esc(report.reportNumber)}</p><p>This TECRID opens a digital card with structured results, laboratory details, and source provenance. Sign in on TECRID with your work email to view your approved card or request access from Kasandrinos.</p><a class="button orange" href="${esc(report.tecridTest.resolverUrl)}#report-panel-title">Open digital TECRID card ↗</a><p>TEST ONLY · Light Labs has not approved or signed this card. The original PDF remains private source evidence.</p><p><a href="https://tecrid.com/dashboard/kasandrinos">Manage Kasandrinos TEST card access ↗</a></p></section>`;
}
