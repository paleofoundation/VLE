# VLE email authentication

Passwordless email ownership is verified by Better Auth, with sessions and one-use hashed verification tokens in D1. Resend sends the email. The public catalog does not require ChatGPT or an email session.

Runtime configuration (Sites environment settings, never source):
- `BETTER_AUTH_SECRET`: random secret of at least 32 characters.
- `BETTER_AUTH_URL`: `https://vle.exchange`.
- `RESEND_API_KEY`: sending credential for the verified sending domain.
- `VLE_EMAIL_FROM`: VLE display name and an address on that verified domain.

Deploy only after the sending account/domain is configured. Test a real received link before claiming live email delivery. The UI reports delivery errors and never substitutes a pretend success. Email-link requests create accounts only after successful mailbox verification. Prior ChatGPT-based demo workspaces are not automatically linked; new email accounts receive independent EXAMPLE workspaces.

Server authorization remains in `access.ts` and the API projection: verified company-email buyers may access full COAs/values; every verified email session may access commercial terms; anonymous visitors receive neither. Company-email classification is the approved prototype default, not company verification. Every verified email may create a private supplier profile with a company name and ingredient category. The profile ID is derived on the server from the authenticated user ID; clients cannot choose another supplier ID. Supplier mode persists across sign-ins. A company-email user may also open their brand workspace. Existing supplier fixtures, draft publication controls and named view history remain owner-review only. New supplier workspaces contain no published lots, inherited conversations or third-party COA views. Real lab uploads and cross-account trading remain unconnected in the EXAMPLE prototype. No recipient email allowlist is configured in the sign-in sender. Mailbox spam policies can still affect individual delivery.

Checks: `node tests/email-auth.mjs` exercises D1 with mocked delivery, token hashing, replay, expiry, cookie security, sign-out, origin/callback validation, rate limiting and transport failures. Built-Worker local checks additionally verify session cookies against the actual API and all evidence/commercial restrictions. No production test login or mock-delivery endpoint exists.
