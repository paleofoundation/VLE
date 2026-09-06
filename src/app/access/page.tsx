import Link from "next/link";
import { resolveCurrentAccess } from "@/lib/current-actor";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const access = await resolveCurrentAccess();
  if (access.status === "SIGNED_OUT") {
    return <main id="main-content" className="accessPage"><div className="accessCard"><span className="mono">ACCESS / SIGN IN</span><h1>Sign in before requesting a VLE role.</h1><p>Clerk authenticates your identity. VLE operations then maps that identity to one verified organization and role.</p><Link className="button buttonDark" href="/sign-in">Sign in</Link></div></main>;
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
        <h1>You are signed in. Your VLE role is not mapped yet.</h1>
        <p>Send this handoff reference to Karen or VLE operations through the agreed external channel. They must confirm your identity and organization before assigning access.</p>
        <dl className="accessReference"><div><dt>Clerk user ID</dt><dd><code>{access.identity.clerkUserId}</code></dd></div><div><dt>Email</dt><dd>{access.identity.email ?? "No Clerk email available"}</dd></div><div><dt>Display name</dt><dd>{access.identity.displayName}</dd></div></dl>
        <div className="accessBoundary"><strong>Sign-in ≠ organization authority.</strong><span>No buyer, supplier, or ops data is visible until a server-side VLE membership exists. Refresh this page after operations confirms the mapping.</span></div>
        <Link className="textLink" href="/">Return to the public shelf</Link>
      </div>
    </main>
  );
}
