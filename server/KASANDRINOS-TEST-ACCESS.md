# Kasandrinos TEST report permissions

Manage the eight linked TEST TECRIDs at https://tecrid.com/dashboard/kasandrinos with the same verified email used for the existing Kasandrinos VLE team owner/admin membership. The VLE database remains authoritative for management roles. Company-domain membership and the general buyer/site-owner rules do not grant management or default viewing for these eight reports.

Approve exact recipient emails for selected reports, with separate results/PDF scopes and optional expiry. Requests appear in the TECRID workspace; approve or decline them there. Revocation blocks future result and PDF requests on both sites. Existing downloaded PDFs cannot be recalled. Owner/admin access is removed through VLE Account & team membership, not a recipient grant.

`kas_report_permissions` stores current report/email state. `kas_report_permission_events` is an append-only revision ledger. Each update inserts the next unique event and updates state in one D1 batch; stale or concurrent revisions fail without overwriting newer permissions. No default recipient grants are seeded. The fixed eight mappings remain source-hash bound and TEST with Light Labs approval/signature pending.

TECRID validates its own email session, then calls the fixed service-only `/api/tecrid-report-permissions` and `/api/tecrid-report-access` endpoints using the existing service secret. Never accept a browser-supplied actor as an authenticated identity. VLE browser PDF routes derive users from VLE sessions and call the same report permission function. Access is checked before retrieving document bytes. Responses are private/no-store; decisions and successful evidence views are recorded.

Run `node tests/tecrid-report-service.mjs`, `node tests/report-gate.mjs`, `node tests/teams.mjs`, and `npx tsc --noEmit`. These use isolated databases, synthetic results and no real mailbox delivery. A current account holder must complete the live email-login walkthrough.


New recipient requests now queue an email to the specifically configured Kasandrinos contact, karen@paleofoundation.com. Each message stays TEST, names requester/report/scope, and links to the exact request after TECRID work-email sign-in. No report values, PDFs or approval tokens are emailed. Opening a link never approves anything.

Migration 0008 stores the request and its notification in the same D1 transaction. Duplicate pending requests do not create repeat mail. Dispatch leases and stable provider idempotency keys protect retries. First delivery is attempted immediately; queued failures retry with backoff on later permission-service or VLE bootstrap activity. There is no unattended timer. Resolved requests awaiting mail are cancelled. The migration queues one fixed TEST setup check that creates no access request or grant.

Run tests/kasandrinos-request-notifications.mjs for notification content, recipient scoping, concurrent delivery, retries, cancellation, review targeting, setup-check isolation and authenticated automatic delivery.
