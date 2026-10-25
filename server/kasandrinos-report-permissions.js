import {evidenceNotifications} from './evidence-notifications.js';
import {requestNotificationStatement} from './kasandrinos-request-notifications.js';
import { kasReports, tecridTestReference } from './kasandrinos.js';
import { teamRole } from './teams.js';
export const testReports = kasReports.filter(r => tecridTestReference(r));
const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie, Authorization', 'X-Content-Type-Options': 'nosniff' };
const json = (data, status = 200) => Response.json(data, { status, headers: privateHeaders });
const emailValue = (v) => typeof v === 'string' && v.length <= 254 && /^[^\s@<>]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(v.trim().toLowerCase()) ? v.trim().toLowerCase() : null;
// Authority comes from the existing explicit Kasandrinos team, never a domain match or site-owner exception.
export async function reportManagerRole(db, user) {
    if (!user)
        return null;
    const team = await db.prepare("SELECT * FROM team_accounts WHERE id='kasandrinos-team' AND supplier_key='kasandrinos'").first();
    if (!team)
        return null;
    const role = await teamRole(db, team, user);
    return role === 'owner' || role === 'admin' ? role : null;
}
export async function reportPermission(db, user, reportNumber, knownRole = undefined) {
    const role = knownRole === undefined ? await reportManagerRole(db, user) : knownRole;
    const row = await db.prepare('SELECT * FROM kas_report_permissions WHERE report_number=? AND recipient_email=?').bind(reportNumber, user.email.toLowerCase()).first();
    const active = row?.status === 'active' && (!row.expires_at || Date.parse(row.expires_at) > Date.now());
    return { reportNumber, canManage: !!role, role, canReadCard: !!role || !!(active && row.results_access), canReadResults: !!role || !!(active && row.results_access), canReadPdf: !!role, status: role ? 'controller' : row?.status === 'active' && !active ? 'expired' : row?.status==='pending'&&!row.requested_results?'not_requested':row?.status || 'not_requested', expiresAt: row?.expires_at || null, revision: row?.revision || 0 };
}
const columns = 'report_number,recipient_email,status,results_access,pdf_access,requested_results,requested_pdf,expires_at,revision,updated_at,updated_by';
export async function reportPermissionRequest(db, user, input) {
    try {
        if (!user || !emailValue(user.email))
            return json({ error: 'Verified email sign-in required.' }, 401);
        const role = await reportManagerRole(db, user);
        if (['notifications','notification-read'].includes(input.action)) {
            if(input.action==='notification-read'&&(typeof input.id!=='string'||input.id.length>240))return json({error:'Invalid notification'},400);
            const result=await evidenceNotifications(db,user,role,input.action==='notification-read'?input.id:undefined);return json(result,result.status||200);
        }
        if (input.action === 'workspace') {
            const reports = await Promise.all(testReports.map(async (r) => ({ identifier: tecridTestReference(r).testIdentifier, title: r.title, sample: r.sample, lotNumbers: r.lotNumbers, ...await reportPermission(db, user, r.reportNumber, role) })));
            const permissions = role ? (await db.prepare(`SELECT p.*, n.id AS request_id, n.status AS notification_status FROM kas_report_permissions p LEFT JOIN kas_access_notifications n ON n.report_number=p.report_number AND n.requester_email=p.recipient_email AND n.request_revision=p.revision ORDER BY p.updated_at DESC LIMIT 500`).all()).results : [];
            const events = role ? (await db.prepare('SELECT report_number,recipient_email,action,results_access,pdf_access,expires_at,actor_email,created_at,revision FROM kas_report_permission_events ORDER BY created_at DESC,rowid DESC LIMIT 100').all()).results : [];
            let targetRequest=null;
            if(role&&typeof input.requestId==='string'&&/^[a-f0-9-]{36}$/.test(input.requestId))targetRequest=await db.prepare('SELECT n.id,n.report_number,n.requester_email,n.request_revision,p.status,p.revision FROM kas_access_notifications n LEFT JOIN kas_report_permissions p ON p.report_number=n.report_number AND p.recipient_email=n.requester_email WHERE n.id=? AND n.kind=?').bind(input.requestId,'access_request').first();
            return json({ targetRequest, notificationEmail: role?'karen@paleofoundation.com':null, sandbox: true, productionAuthority: false, laboratoryApproval: 'pending', controller: { name: 'Kasandrinos · TEST', code: 'KASTEST', authority: 'Existing Kasandrinos VLE team' }, canManage: !!role, role, email: user.email, reports, permissions:permissions.map(p=>({...p,card_access:p.results_access,requested_card:p.requested_results})), events });
        }
        const report = testReports.find(r => r.reportNumber === input.reportNumber);
        if (input.action === 'status')
            return report ? json(await reportPermission(db, user, report.reportNumber)) : json({ error: 'Unknown TEST report.' }, 404);
        if (input.action === 'request') {
            if (!report)
                return json({ error: 'Unknown TEST report.' }, 404);
            const current = await db.prepare('SELECT * FROM kas_report_permissions WHERE report_number=? AND recipient_email=?').bind(report.reportNumber, user.email.toLowerCase()).first();
            if (role || (current?.status === 'pending' && current.requested_results))
                return json({ ok: true });
            // Legacy results columns store digital-card access. Never widen a PDF-only grant.
            const results = input.card === true || input.results === true, pdf = false;
            if(input.pdf === true)return json({error:'Request the digital TECRID card. Original PDFs are private source evidence.'},400);
            if (!results && !pdf)
                return json({ error: 'Request digital card access.' }, 400);
            if (current?.status === 'active' && current.results_access && (!current.expires_at || Date.parse(current.expires_at) > Date.now()))
                return json({ error: 'An active grant already exists. Ask the controller to change its scope.' }, 409);
            const notificationIds=await savePermissions(db, user, [{ reportNumber: report.reportNumber, email: user.email.toLowerCase(), revision: current?.revision || 0, results: false, pdf: false, requestedResults: results, requestedPdf: pdf, status: 'pending', expiresAt: null }], 'request');
            return json({ ok: true, status: 'pending', sandbox: true, productionAuthority:false, notificationId:notificationIds[0] });
        }
        if (!role)
            return json({ error: 'Kasandrinos owner or administrator permission required.' }, 403);
        if (!['grant', 'revoke', 'decline'].includes(input.action))
            return json({ error: 'Unknown permission action.' }, 400);
        const email = emailValue(input.email);
        if (!email)
            return json({ error: 'Enter the recipient’s exact verified email.' }, 400);
        if (!Array.isArray(input.reports) || input.reports.length < 1 || input.reports.length > 8 || new Set(input.reports.map((r) => r.reportNumber)).size !== input.reports.length)
            return json({ error: 'Select one to eight distinct TEST reports.' }, 400);
        const results = input.action === 'grant' && (input.card === true || input.results === true), pdf = false;
        if(input.action === 'grant' && input.pdf === true)return json({error:'Approve the digital TECRID card. Original PDFs are private source evidence.'},400);
        if (input.action === 'grant' && !results && !pdf)
            return json({ error: 'Approve digital card access.' }, 400);
        let expiresAt = null;
        if (input.action === 'grant' && input.expiresAt) {
            const t = Date.parse(input.expiresAt);
            if (!Number.isFinite(t) || t <= Date.now() || t > Date.now() + 366 * 86400000)
                return json({ error: 'Choose an expiry within the next year.' }, 400);
            expiresAt = new Date(t).toISOString();
        }
        const changes = [];
        for (const item of input.reports) {
            if (!testReports.some(r => r.reportNumber === item.reportNumber) || !Number.isSafeInteger(item.revision) || item.revision < 0)
                return json({ error: 'Invalid report or revision.' }, 400);
            const current = await db.prepare('SELECT revision FROM kas_report_permissions WHERE report_number=? AND recipient_email=?').bind(item.reportNumber, email).first();
            if ((current?.revision || 0) !== item.revision)
                return json({ error: 'Permissions changed in another tab. Refresh before saving.' }, 409);
            changes.push({ reportNumber: item.reportNumber, email, revision: item.revision, results, pdf, requestedResults: false, requestedPdf: false, status: input.action === 'grant' ? 'active' : input.action === 'revoke' ? 'revoked' : 'declined', expiresAt });
        }
        // Recheck authority immediately before the transactional write.
        if (!await reportManagerRole(db, user))
            return json({ error: 'Your manager permission was revoked. Refresh.' }, 403);
        await savePermissions(db, user, changes, input.action);
        return json({ ok: true, sandbox: true, productionAuthority: false });
    }
    catch (error) {
        if (String(error).includes('UNIQUE constraint failed'))
            return json({ error: 'Permissions changed in another tab. Refresh before saving.' }, 409);
        console.error('Kasandrinos permissions unavailable');
        return json({ error: 'Permissions are temporarily unavailable.' }, 503);
    }
}
async function savePermissions(db, user, changes, action) {
    const statements = [];
    const notificationIds=[];
    const at = new Date().toISOString();
    for (const c of changes) {
        const revision = c.revision + 1;
        // Unique (report,recipient,revision) makes concurrent stale writes fail the whole D1 batch.
        statements.push(db.prepare('INSERT INTO kas_report_permission_events (report_number,recipient_email,revision,action,results_access,pdf_access,expires_at,actor_email,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(c.reportNumber, c.email, revision, action, Number(c.results), Number(c.pdf), c.expiresAt, user.email.toLowerCase(), at));
        statements.push(db.prepare(`INSERT INTO kas_report_permissions (${columns}) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(report_number,recipient_email) DO UPDATE SET status=excluded.status,results_access=excluded.results_access,pdf_access=excluded.pdf_access,requested_results=excluded.requested_results,requested_pdf=excluded.requested_pdf,expires_at=excluded.expires_at,revision=excluded.revision,updated_at=excluded.updated_at,updated_by=excluded.updated_by`).bind(c.reportNumber, c.email, c.status, Number(c.results), Number(c.pdf), Number(c.requestedResults), Number(c.requestedPdf), c.expiresAt, revision, at, user.email.toLowerCase()));
        if(action==='request'){
            const notificationId=crypto.randomUUID();notificationIds.push(notificationId);
            statements.push(requestNotificationStatement(db,c,revision,at,notificationId));
        }
    }
    await db.batch(statements);
    return notificationIds;
}
