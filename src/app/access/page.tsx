import Link from "next/link";
import { resolveCurrentAccess } from "@/lib/current-actor";
import { PilotStatusRail } from "../pilot-status-rail";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const access = await resolveCurrentAccess();
  if (access.status === "SIGNED_OUT") {
    return <main id="main-content" className="accessPage"><PilotStatusRail audience="access" /><div className="accessCard"><div className="accessStatusHead"><span className="mono">ACCESS / SIGN IN</span><span className="status accessStatus"><i /> Reviewed pilot</span></div><h1>Sign in to enter the review lane.</h1><p>Clerk authenticates your identity. VLE operations then maps that identity to one verified organization and role; signing in alone reveals no private workspace data.</p><div className="accessPromise"><span className="mono">WHAT HAPPENS NEXT</span><strong>Identity → organization review → workspace</strong><p>No buyer, supplier, or operations data appears before the server-side membership exists.</p></div><div className="accessActions"><Link className="button buttonDark" href="/sign-in">Sign in securely</Link><Link className="textLink" href="/#passed-lots">Preview the pilot shelf</Link></div></div></main>;
  }
  if (access.status === "ACTIVE") {
    const roles = access.actor.roles;
    const destination = roles.some((role) => role === "OPS" || role === "ADMIN") ? "/ops" : roles.includes("SUPPLIER") ? "/supplier" : "/buyer";
    return <main id="main-content" className="accessPage"><PilotStatusRail audience="access" /><div className="accessCard"><div className="accessStatusHead"><span className="mono">ACCESS / ACTIVE</span><span className="status statusPassed"><i /> Membership active</span></div><h1>Your reviewed workspace is ready.</h1><p>Organization <code>{access.actor.organizationId}</code> · role {roles.join(" · ")}</p><div className="accessPromise"><span className="mono">AUTHORITY CHECK</span><strong>Identity and membership resolved server-side</strong><p>Your workspace opens only with the organization and role recorded for this Clerk identity.</p></div><Link className="button buttonDark" href={destination}>Open workspace</Link></div></main>;
  }

  return (
    <main id="main-content" className="accessPage">
      <PilotStatusRail audience="access" />
      <div className="accessCard accessPendingCard">
        <div className="accessStatusHead"><span className="mono">ACCESS / PENDING MAPPING</span><span className="status accessStatusPending"><i /> Review in progress</span></div>
        <h1>Your identity is in the review lane.</h1>
        <p>This is a normal pilot access state—not a broken workspace. VLE has authenticated the identity but has not granted organization authority. Send the handoff reference below to Karen or VLE operations through the agreed external channel.</p>
        <ol className="accessReviewRail" aria-label="Pilot access review progress"><li className="isComplete"><span>01</span><div><strong>Identity signed in</strong><small>Clerk authentication complete</small></div></li><li className="isPending"><span>02</span><div><strong>Organization + role review</strong><small>Pending operations mapping</small></div></li><li><span>03</span><div><strong>Workspace opens</strong><small>Only after server-side approval</small></div></li></ol>
        <dl className="accessReference"><div><dt>Clerk user ID</dt><dd><code>{access.identity.clerkUserId}</code></dd></div><div><dt>Email</dt><dd>{access.identity.email ?? "No Clerk email available"}</dd></div><div><dt>Display name</dt><dd>{access.identity.displayName}</dd></div></dl>
        <div className="accessPendingGrid"><div className="accessBoundary"><strong>Sign-in ≠ organization authority.</strong><span>No buyer, supplier, or ops data is visible until a server-side VLE membership exists.</span></div><div className="accessNextStep"><span className="mono">NEXT CHECKPOINT</span><strong>Operations verifies the organization and derives the permitted role.</strong><p>Refresh this page only after operations confirms the mapping.</p></div></div>
        <div className="accessActions"><Link className="button buttonDark" href="/access">Check mapping again</Link><Link className="textLink" href="/#passed-lots">Continue on the public shelf</Link></div>
      </div>
    </main>
  );
}
