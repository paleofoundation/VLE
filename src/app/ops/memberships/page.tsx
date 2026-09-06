import Link from "next/link";
import { getCurrentPageActor } from "@/lib/page-actor";
import { listMembershipMappingData } from "@/services/memberships";
import { mapClerkMembershipAction } from "./actions";

export const dynamic = "force-dynamic";

const date = (value: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(value);

export default async function MembershipMappingPage({ searchParams }: { searchParams: Promise<{ mapped?: string | string[] }> }) {
  const actor = await getCurrentPageActor();
  if (!actor.roles.some((role) => role === "OPS" || role === "ADMIN")) {
    return <main id="main-content" className="accessPage"><div className="accessCard"><span className="mono">AUTHZ / OPS</span><h1>Operations access required.</h1><p>Your VLE membership cannot map Clerk identities.</p><Link className="textLink" href="/">Return to the public shelf</Link></div></main>;
  }
  const [{ mapped }, data] = await Promise.all([searchParams, listMembershipMappingData(actor)]);

  return (
    <main id="main-content" className="membershipPage">
      <div className="detailBreadcrumb"><Link className="back" href="/ops">Operations board</Link><span aria-hidden="true">/</span><span>Access mapping</span></div>
      <section className="membershipHero">
        <div><p className="eyebrow">Clerk identity → VLE tenancy</p><h1>Map a real person to one operating lane.</h1><p className="sectionLead">Use the handoff reference shown after their first sign-in. VLE—not browser copy and not Clerk metadata—remains the server-side source of organization and role authorization.</p></div>
        <div className="membershipBoundary"><span className="mono">AUTHZ / MANAGED</span><strong>Identity ≠ membership</strong><p>Signing in proves a Clerk identity. An ops-reviewed mapping separately assigns exactly one existing VLE organization and its modeled role.</p></div>
      </section>

      {mapped === "1" ? <div className="success" role="status" aria-live="polite"><strong>Membership mapped.</strong><span>Ask the user to refresh `/access`; their server-authorized workspace will now be available.</span></div> : null}

      <div className="membershipLayout">
        <section className="membershipFormPanel" aria-labelledby="mapping-form-heading">
          <div><p className="eyebrow">Ops action</p><h2 id="mapping-form-heading">First-login handoff</h2><p>Copy the Clerk user ID and primary email exactly from the user&apos;s `/access` screen. Confirm the person and organization outside VLE before mapping.</p></div>
          <form action={mapClerkMembershipAction} className="formCard membershipForm">
            <label>Clerk user ID<input name="clerkUserId" required minLength={5} maxLength={255} autoComplete="off" placeholder="user_…" /></label>
            <label>Primary Clerk email<input name="email" type="email" required autoComplete="off" placeholder="person@company.com" /><small>The server resolves the Clerk user ID and rejects the mapping unless this matches Clerk&apos;s current primary email. Display name is also read from Clerk.</small></label>
            <label>VLE organization<select name="organizationId" required defaultValue=""><option value="" disabled>Select the verified organization</option>{data.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} · {organization.kind} → {organization.mappedRole}</option>)}</select><small>The role is derived from organization kind: supplier → SUPPLIER, buyer → BUYER, platform → OPS. This UI cannot grant ADMIN.</small></label>
            <div className="formSubmit"><p>Mapping is audit-recorded. Existing memberships and conflicting identity/email pairs fail closed.</p><button className="button" type="submit">Map organization membership</button></div>
          </form>
        </section>

        <aside className="membershipRoster" aria-labelledby="membership-roster-heading">
          <div><p className="eyebrow">Current access</p><h2 id="membership-roster-heading">Mapped identities</h2></div>
          {data.mappings.length ? <ol>{data.mappings.map((mapping) => <li key={mapping.membershipId}><div><strong>{mapping.displayName}</strong><span className={`stateChip state-${mapping.role.toLowerCase()}`}>{mapping.role}</span></div><p>{mapping.email}</p><code>{mapping.clerkUserId}</code><small>{mapping.organizationName} · mapped {date(mapping.createdAt)}</small></li>)}</ol> : <div className="opsEmpty compact"><h3>No memberships mapped.</h3><p>The first reviewed Clerk handoff will appear here.</p></div>}
        </aside>
      </div>
    </main>
  );
}
