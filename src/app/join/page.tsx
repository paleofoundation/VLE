import type { Metadata } from "next";
import Link from "next/link";
import { ExampleProfileNotice } from "../example-profile-notice";

export const metadata: Metadata = {
  title: "Join VLE — Free Core Access",
  description: "Join the Verified Lot Exchange pilot. Core access is free forever; optional white-glove help never buys qualification, listing eligibility, or evidence authenticity.",
};

const coreFeatures = [
  "Browse the public eligibility shelf",
  "Use supplier, buyer, and laboratory walkthroughs",
  "See EXAMPLE limits and pilot boundaries clearly",
  "Request reviewed access for a real organization",
] as const;

const assistedFeatures = [
  "Pilot briefing and role-by-role onboarding",
  "Lot-readiness and evidence-handoff planning",
  "Team walkthroughs across ICS, TECRID, and VLE",
  "Human help navigating the independent-sample path",
] as const;

const roleDoors = [
  {
    marker: "01",
    title: "Supplier",
    description: "Prepare one identifiable stocked lot for independent sampling, evidence review, and a deterministic qualification decision.",
    href: "/for-suppliers",
    cta: "See the supplier path",
  },
  {
    marker: "02",
    title: "Buyer",
    description: "Start with the profile you need, inspect the qualification basis, and source only from the eligible public shelf.",
    href: "/for-buyers",
    cta: "See the buyer path",
  },
  {
    marker: "03",
    title: "Laboratory",
    description: "See where controlled sampling, custody, and TECRID-authenticated evidence fit without turning a PDF into qualification.",
    href: "/for-laboratories",
    cta: "See the laboratory path",
  },
] as const;

export default function JoinPage() {
  return (
    <main id="main-content" className="joinPage">
      <section className="joinHero" aria-labelledby="join-heading">
        <div className="joinHeroCopy">
          <p className="eyebrow eyebrowLight">Join VLE · Public pilot</p>
          <h1 id="join-heading">The core exchange is free. Human help is optional.</h1>
          <p>Explore the eligibility shelf, learn each role, and request reviewed access without a checkout. Evidence—not payment—decides whether a lot can be called QUALIFIED or publicly listed.</p>
          <div className="actions">
            <Link className="button" href="#choose-role">Choose your role</Link>
            <Link className="textLink textLinkLight" href="/access">Request reviewed access</Link>
            <Link className="textLink textLinkLight" href="/faq">Read the diligence FAQ</Link>
          </div>
        </div>
        <aside className="joinPromise" aria-label="VLE access promise">
          <div className="joinPromiseHead">
            <span className="signal"><i /> Core access</span>
            <span className="mono">FREE / FOREVER</span>
          </div>
          <strong>Free forever</strong>
          <p>Public shelf, role walkthroughs, EXAMPLE honesty, and reviewed access are the core VLE path.</p>
          <dl>
            <div><dt>Credit card</dt><dd>Not required</dd></div>
            <div><dt>Qualification for sale</dt><dd>Never</dd></div>
            <div><dt>Listing fee</dt><dd>None</dd></div>
          </dl>
        </aside>
      </section>

      <ExampleProfileNotice />

      <section className="joinPlans" aria-labelledby="access-model-heading">
        <div className="joinSectionHeading">
          <p className="eyebrow">Access model</p>
          <h2 id="access-model-heading">One free core. One optional human layer.</h2>
          <p>No tier can buy credibility. Qualification and publication remain bound to an identified lot, a frozen Profile, controlled sampling, current TECRID-linked evidence, and the resulting decision.</p>
        </div>

        <div className="joinPlanGrid">
          <article className="joinPlan joinPlanCore">
            <div className="joinPlanTop"><span className="mono">CORE / 01</span><b>Free forever</b></div>
            <h3>Use VLE</h3>
            <p>The complete public pilot journey, with reviewed organization access when you are ready to work with real lot facts.</p>
            <ul>{coreFeatures.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
            <Link className="button buttonDark" href="/access">Request reviewed access</Link>
            <small>PENDING MAPPING is an intentional identity-to-organization review gate, not a paid tier.</small>
          </article>

          <article className="joinPlan joinPlanAssist">
            <div className="joinPlanTop"><span className="mono">WHITE-GLOVE / 02</span><b>Optional</b></div>
            <h3>Work with a human</h3>
            <p>For teams that want hands-on implementation help. Scope and timing are discussed with ICS; no VLE fee is invented here.</p>
            <ul>{assistedFeatures.map((feature) => <li key={feature}><span aria-hidden="true">→</span>{feature}</li>)}</ul>
            <Link className="button buttonDark" href="/access">Request an ICS briefing</Link>
            <small>White-glove help never purchases QUALIFIED status, listing eligibility, or TECRID authenticity.</small>
          </article>
        </div>
      </section>

      <section className="joinRoles" id="choose-role" aria-labelledby="role-heading">
        <div className="joinSectionHeading">
          <p className="eyebrow">Choose your door</p>
          <h2 id="role-heading">Same evidence spine. Clear role handoffs.</h2>
        </div>
        <div className="joinRoleGrid">
          {roleDoors.map((role) => (
            <article className="joinRole" key={role.title}>
              <span className="mono">{role.marker} / ROLE</span>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
              <Link className="cardLink" href={role.href}><span>{role.cta}</span><span aria-hidden="true">↗</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="joinEvidence" aria-labelledby="evidence-heading">
        <div>
          <p className="eyebrow eyebrowLight">The dual ask</p>
          <h2 id="evidence-heading">Mint the evidence. Independently sample the lot.</h2>
          <p>TECRID authenticates the evidence record. VLE separately binds the physical lot to sampling, custody, the frozen Profile, and the qualification decision.</p>
        </div>
        <div className="joinEvidenceActions">
          <a className="button" href="https://tecrid.com/laboratory-go-time">Laboratories: evidence go-time</a>
          <a className="button buttonOutlineLight" href="https://tecrid.com/join">Join TECRID</a>
          <p>PDF/COA ≠ QUALIFIED. Evidence authenticity is required, but it does not replace VLE&apos;s independent lot and decision gates.</p>
        </div>
      </section>

      <section className="joinBoundary" aria-label="Non-purchasable claim boundary">
        <span className="mono">NON-PURCHASABLE</span>
        <p><strong>Credibility is not a product tier.</strong> No payment can create a QUALIFIED decision, make a lot eligible for listing, authenticate TECRID evidence, or substitute for controlled sampling and custody. <Link className="textLink" href="/faq">Review the operating and evidence boundaries</Link></p>
      </section>
    </main>
  );
}
