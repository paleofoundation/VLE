# Clerk identity → VLE membership runbook

## Boundary

Clerk authenticates a person. VLE's Postgres `users` and `memberships` tables authorize that person for one existing organization and role. A successful sign-in is not organization authority and creates no buyer, supplier, or ops access by itself.

This pilot deliberately does not duplicate organizations or roles into Clerk Organizations. The server-side VLE membership remains the single authorization source used by every page, Server Action, and compliance-pack route.

The managed mapping UI supports only the existing operational roles:

| VLE organization kind | Assigned role |
| --- | --- |
| `SUPPLIER` | `SUPPLIER` |
| `BUYER` | `BUYER` |
| `PLATFORM` | `OPS` |

`ADMIN` cannot be granted through the UI.

## First-login handoff

1. The person signs in through Clerk and opens `/access`.
2. If no server-side VLE membership exists, the page shows `PENDING MAPPING` plus their Clerk user ID, primary email, and display name. It exposes no tenant data.
3. The person sends those three values to Karen or an authorized VLE operator through the agreed external channel. VLE adds no inbox or messaging feature.
4. The operator independently confirms the person's identity, company, and intended VLE organization. Email alone is not sufficient authority.
5. An OPS/ADMIN user opens `/ops/memberships`, copies the Clerk user ID and primary email, selects an existing organization, and submits.
6. The server re-authenticates the operator before calling Clerk, resolves the target user through Clerk's backend, requires the copied email to match Clerk's current primary email, rejects existing memberships and identity/email conflicts, derives the role from organization kind, and records `CLERK_MEMBERSHIP_MAPPED` in the immutable audit chain. The display name is read from Clerk, not trusted from the form.
7. The new user refreshes `/access` and enters the buyer, supplier, or ops workspace. A stale Clerk session is not used for authorization; VLE reads the database on each protected request.

## One-time first operator bootstrap

The mapping UI requires an already-authorized operator. On a newly seeded environment only, Karen performs one controlled trust-root bootstrap after signing into Clerk and copying her values from `/access`:

```bash
VLE_BOOTSTRAP_OPS_CLERK_USER_ID='user_from_clerk' \
npm run access:bootstrap
```

The script resolves that Clerk user through Clerk's backend, then replaces only the exact `seed_ops_replace_with_clerk_id` placeholder that already owns the seeded platform `OPS` membership. It fails closed if the user has no Clerk email or if the placeholder, platform membership, Clerk ID, or email is ambiguous. The mutation is transactionally audit-recorded as `CLERK_OPS_BOOTSTRAPPED`. Re-running with the same Clerk ID is idempotent; once the placeholder is gone, the bootstrap path cannot grant a second operator.

Do not keep the bootstrap variable in Vercel or `.env.local`. Provide it only to the one command, verify the resulting `/access` page, then use `/ops/memberships` for every later mapping.

## Operator checklist

- [ ] User is signed in and copied the Clerk user ID from their own `/access` screen.
- [ ] Primary email and person were confirmed outside VLE; no role is granted from email alone.
- [ ] The target organization already exists and its kind matches the intended lane.
- [ ] Supplier users map to a specific `SUPPLIER` organization; buyer users map to a specific `BUYER` organization; VLE operators map only to `PLATFORM`.
- [ ] The mapping success banner appears and the roster shows the expected organization/role.
- [ ] The user refreshes `/access` and can open only the expected workspace.
- [ ] Direct access to an unauthorized role page remains denied server-side.
- [ ] Nomination intake, artifact logging, and compliance-pack downloads remain OPS/ADMIN-only after mapping.

## Recovery and corrections

The pilot UI intentionally has no delete, remap, bulk invite, or self-service role elevation. A wrong organization, duplicate identity, email collision, departing user, or role change is an ops incident: stop access, inspect the immutable mapping audit event, and perform a reviewed database correction before re-enabling the user. Do not create a second membership to work around a conflict; `getCurrentActor()` expects one active organization context.

Clerk invitations, Clerk Organizations, SSO, verified-domain auto-join, SCIM, and webhook-driven provisioning remain deferred partner/identity work. None is implied by this mapping surface.
