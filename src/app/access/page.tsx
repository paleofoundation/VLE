import Link from "next/link";
import { resolveCurrentAccess } from "@/lib/current-actor";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const access = await resolveCurrentAccess();
  if (access.status === "SIGNED_OUT") {
    return <main id="main-content" className="accessPage"><div className="accessCard"><span className="mono">ACCESS / SIGN IN</span><h1>Sign in to begin reviewed pilot access.</h1><p>Clerk authenticates your identity. VLE operations then maps that identity to one verified organization and role; signing in alone reveals no private workspace data.</p><div className="accessActions"><Link className="button buttonDark" href="/sign-in">Sign in</Link><Link className="textLink" href="/#passed-lots">Preview the public shelf</Link></div></div></main>;
  }
  if (access.status === "ACTIVE") {
    const roles = access.actor.roles;
    const destination = roles.some((role) => role === "OPS" || role === "ADMIN") ? "/ops" : roles.includes("SUPPLIER") ? "/supplier" : "/buyer";
    return <main id="main-content" className="accessPage"><div className="accessCard"><span className="mono">ACCESS / ACTIVE</span><h1>Your VLE membership is active.</h1><p>Organization <code>{access.actor.organizationId}</code> · role {roles.join(" · ")}</p><Link className="button buttonDark" href={destination}>Open workspace</Link></div></main>;
  }

  return (
    <main id="main-content" className="accessPage">
      <div className="accessCard accessPendingCard">
        <span className="mono">ACCESS / PENDING MAPPING</span>
        <h1>Your identity is in the review lane.</h1>
        <p>This is a normal pilot access state—not a broken workspace. Send the handoff reference below to Karen or VLE operations through the agreed external channel so they can independently confirm your organization and role.</p>
        <ol className="accessReviewRail" aria-label="Pilot access review progress"><li className="isComplete"><span>01</span><div><strong>Identity signed in</strong><small>Clerk authentication complete</small></div></li><li className="isPending"><span>02</span><div><strong>Organization + role review</strong><small>Pending operations mapping</small></div></li><li><span>03</span><div><strong>Workspace opens</strong><small>Only after server-side approval</small></div></li></ol>
        <dl className="accessReference"><div><dt>Clerk user ID</dt><dd><code>{access.identity.clerkUserId}</code></dd></div><div><dt>Email</dt><dd>{access.identity.email ?? "No Clerk email available"}</dd></div><div><dt>Display name</dt><dd>{access.identity.displayName}</dd></div></dl>
        <div className="accessBoundary"><strong>Sign-in ≠ organization authority.</strong><span>No buyer, supplier, or ops data is visible until a server-side VLE membership exists. Refresh this page after operations confirms the mapping.</span></div>
        <div className="accessActions"><Link className="button buttonDark" href="/access">Check mapping again</Link><Link className="textLink" href="/#passed-lots">Continue on the public shelf</Link></div>
      </div>
    </main>
  );
}
