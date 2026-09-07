import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "VLE FAQ — Operator, Evidence, and Pilot Diligence",
  description: "Upfront answers about who operates VLE, the HMI–TECRID–VLE–HMTc evidence network, independent sampling, and the EU-first pilot.",
};

const workflow = [
  ["01", "Nominate", "A supplier identifies a physical lot, available quantity, warehouse location, and authority."],
  ["02", "Sample + seal", "An independent sampler binds the draw to the nominated lot and documents seal and custody."],
  ["03", "Analyze", "An ISO 17025 laboratory analyzes the controlled sample against the requested scope."],
  ["04", "Authenticate", "TECRID-linked evidence establishes authenticity and current status; it does not decide that a lot passed for sale."],
  ["05", "Decide", "VLE applies the named frozen Compliance Profile and publishes only an eligible lot-specific decision."],
] as const;

const questions = [
  {
    question: "Who operates Verified Lot Exchange?",
    answer: <p><strong>Paleo Certified Inc.</strong> operates Verified Lot Exchange (VLE).</p>,
  },
  {
    question: "What is ICS, and how long has the company operated certification programs?",
    answer: <p><a className="textLink" href="https://contaminantstandards.com">Institute of Contaminant Standards (ICS)</a> is a registered DBA of Paleo Certified Inc. The same company has operated paleo, keto, and grain-free certification programs since January 2010.</p>,
  },
  {
    question: "How do HMI, TECRID, VLE, and HMTc divide responsibility?",
    answer: <><p><strong>HMI knows → TECRID authenticates evidence → VLE sources passed lots → HMTc certifies finished products.</strong></p><p>VLE does not replace TECRID or HMTc. TECRID authentication is necessary evidence infrastructure; it is not a VLE decision that a lot passed for sale.</p></>,
  },
  {
    question: "Does a PDF, COA, or TECRID record make a lot QUALIFIED?",
    answer: <p><strong>No. PDF/COA ≠ QUALIFIED, and TECRID ≠ passed for sale.</strong> VLE separately requires an identified lot, controlled sampling and custody, current authenticated evidence, a named frozen Compliance Profile, and the resulting deterministic decision.</p>,
  },
  {
    question: "What does the independent sampler do?",
    answer: <p>The sampler connects the laboratory result to the physical lot: binding the draw to the nomination, recording the seal, and preserving the custody trail into laboratory analysis. Supplier paperwork alone does not replace that independent sample path.</p>,
  },
  {
    question: "Where does the pilot start?",
    answer: <p>The pilot starts with Dutch and nearby EU warehouses for EU pulls. That is the first operating geography, not a claim of global coverage.</p>,
  },
  {
    question: "What are the registered office, company registration number, and sampler contracting or payment arrangements?",
    answer: <p>Those details are available on request through counsel or the diligence pack. VLE does not publish or infer an address, registration number, payer, or contracting entity on this page.</p>,
  },
] as const;

export default function FaqPage() {
  return (
    <main id="main-content" className="faqPage">
      <section className="faqHero" aria-labelledby="faq-heading">
        <div>
          <p className="eyebrow eyebrowLight">Public diligence FAQ</p>
          <h1 id="faq-heading">The operating facts, up front.</h1>
          <p>Who runs VLE, what each evidence-network layer does, and where the physical pilot begins—without filling diligence gaps with invented facts.</p>
          <div className="actions">
            <Link className="button" href="#questions">Read the answers</Link>
            <Link className="textLink textLinkLight" href="/access">Request diligence access</Link>
          </div>
        </div>
        <aside className="faqOperator" aria-label="VLE operator summary">
          <span className="mono">OPERATOR / LOCKED</span>
          <h2>Paleo Certified Inc.</h2>
          <p>Operates Verified Lot Exchange and the registered ICS DBA.</p>
          <dl>
            <div><dt>Certification programs</dt><dd>Since January 2010</dd></div>
            <div><dt>Pilot geography</dt><dd>EU first</dd></div>
            <div><dt>Unpublished legal facts</dt><dd>Via counsel</dd></div>
          </dl>
        </aside>
      </section>

      <section className="faqNetwork" aria-labelledby="network-summary-heading">
        <div>
          <p className="eyebrow">One network. Four responsibilities.</p>
          <h2 id="network-summary-heading">Know → authenticate → source → certify.</h2>
        </div>
        <ol>
          <li><span>01</span><strong>HMI</strong><small>knows</small></li>
          <li><span>02</span><strong>TECRID</strong><small>authenticates evidence</small></li>
          <li><span>03</span><strong>VLE</strong><small>sources passed lots</small></li>
          <li><span>04</span><strong>HMTc</strong><small>certifies finished products</small></li>
        </ol>
        <p className="faqNetworkBoundary"><strong>Two distinct gates:</strong> PDF/COA ≠ QUALIFIED. TECRID ≠ passed for sale.</p>
      </section>

      <section className="faqWorkflow" aria-labelledby="workflow-heading">
        <div className="faqSectionHeading">
          <p className="eyebrow">Pilot workflow</p>
          <h2 id="workflow-heading">The sample connects evidence to the lot.</h2>
          <p>The independent sampler is the physical bridge between a nomination and laboratory evidence. Each handoff remains separate and auditable.</p>
        </div>
        <ol>
          {workflow.map(([number, title, description]) => (
            <li key={number}>
              <span className="mono">{number}</span>
              <div><strong>{title}</strong><p>{description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="faqQuestions" id="questions" aria-labelledby="questions-heading">
        <div className="faqSectionHeading">
          <p className="eyebrow">Diligence answers</p>
          <h2 id="questions-heading">What a buyer, supplier, lab, or counsel will ask.</h2>
        </div>
        <div className="faqList">
          {questions.map(({ question, answer }, index) => (
            <details key={question} open={index < 2}>
              <summary><span className="mono">{String(index + 1).padStart(2, "0")}</span><strong>{question}</strong><i aria-hidden="true">+</i></summary>
              <div>{answer}</div>
            </details>
          ))}
        </div>
      </section>

      <section className="faqNext" aria-labelledby="faq-next-heading">
        <div>
          <p className="eyebrow eyebrowLight">Evidence handoff</p>
          <h2 id="faq-next-heading">Laboratory ready? Take the dual path.</h2>
          <p>Prepare the independent sample workflow for VLE while setting up the authenticated evidence path with TECRID.</p>
        </div>
        <div className="faqNextActions">
          <a className="button" href="https://tecrid.com/laboratory-go-time">TECRID laboratory go-time</a>
          <a className="button buttonOutlineLight" href="https://tecrid.com/join">Join TECRID</a>
          <Link className="textLink textLinkLight" href="/join">Return to VLE join</Link>
        </div>
      </section>
    </main>
  );
}
