import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicCertifications } from "@/components/listing/certifications";
import { getSupplier } from "@/lib/public-listings";
import { publicPageMetadata } from "@/lib/seo";
import {
  supplierDocumentNotice,
  kasandrinosCertifications,
  kasandrinosProducts,
  kasandrinosReports,
  kasandrinosTransparencyUrl,
} from "@/content/suppliers/kasandrinos";
import styles from "./profile.module.css";

export const metadata = publicPageMetadata(
  "/suppliers/kasandrinos",
  "Kasandrinos supplier profile | VLE",
  "Kasandrinos International LLC: family-grown organic extra virgin olive oil from Greece. Listed from public documents. Not a VLE member. Explore supplier-published documents and pending VLE steps.",
);

// Advance a step only when a real, lot-specific record supports it.
// Supplier-published reports below do not satisfy any of these steps.
const lotSteps = [
  { title: "Lot", detail: "Awaiting a confirmed purchase and lot identity." },
  { title: "Sample", detail: "Awaiting laboratory receipt and the sample custody record." },
  { title: "TECRID", detail: "Awaiting authenticated evidence bound to the lot." },
  { title: "QUALIFIED", detail: "Awaiting a qualification decision against the olive oil standard." },
  { title: "Reserved", detail: "Awaiting qualification and a recorded reservation." },
] as const;

export const dynamic = "force-dynamic";
export default async function KasandrinosSupplierPage() {
  const profile = await getSupplier("kasandrinos");
  if (!profile) notFound();
  return (
    <main id="main-content" className={styles.profile}>
      <aside className={styles.profileBanner} aria-label="Profile listing status">
        Listed from public documents. Not a VLE member. <a href="mailto:marcus@vle.exchange">Claim this profile</a>.
      </aside>
      <div className={styles.breadcrumb}>
        <Link className="back" href="/suppliers">Supplier profiles</Link>
        <span aria-hidden="true">/</span><span>Kasandrinos</span>
      </div>

      <section className={styles.hero} aria-labelledby="supplier-name">
        <div className={styles.heroCopy}>
          <p className="eyebrow eyebrowLight">Supplier profile · Greece</p>
          <h1 id="supplier-name">Kasandrinos</h1>
          <p className={styles.legalName}>Kasandrinos International LLC</p>
          <p className={styles.intro}>Family-grown organic extra virgin olive oil from Greece.</p>
          <p className={styles.heroDescription}>From family farms in Laconia, Greece. Explore the supplier&apos;s products and published documents, then follow the VLE lot as evidence is recorded.</p>
          <div className="actions">
            <a className="button" href="https://www.kasandrinos.com/" rel="noopener noreferrer">Visit kasandrinos.com <span aria-hidden="true">↗</span></a>
            <a className="textLink textLinkLight" href="#vle-lot">Follow the VLE lot</a>
          </div>
        </div>
      </section>

      <nav className={styles.sectionNav} aria-label="Supplier profile sections">
        <a href="#products">Products</a>
        <a href="#certifications">Certifications</a>
        <a href="#brand-reports">Brand-published test reports</a>
        <a href="#vle-lot">VLE lot</a>
      </nav>

      <section className={styles.section} id="products" aria-labelledby="products-heading">
        <div className={styles.sectionHeading}>
          <div><p className="eyebrow">The product range</p><h2 id="products-heading">Greek olive oil, in every format.</h2></div>
          <p>Each product links to the supplier&apos;s original product page on kasandrinos.com.</p>
        </div>
        <div className={styles.products}>
          {kasandrinosProducts.map((product) => (
            <a className={styles.product} key={product.url} href={product.url} rel="noopener noreferrer">
              <div className={styles.productCopy}><h3>{product.name}</h3><p>{product.format}</p><span>View product <span aria-hidden="true">↗</span></span></div>
            </a>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.certSection}`} id="certifications" aria-labelledby="certifications-heading">
        <div className={styles.sectionHeading}>
          <div><p className="eyebrow">Brand-published documents</p><h2 id="certifications-heading">Certifications</h2></div>
          <p>Certification documents linked from the supplier&apos;s <a href={kasandrinosTransparencyUrl} className={styles.inlineLink}>Transparency page</a>. These do not establish VLE lot qualification.</p>
        </div>
        <div className={styles.certifications}>
          {kasandrinosCertifications.map((certificate) => (
            <article className={styles.certificate} key={certificate.url}>
              <h3>{certificate.name}</h3><p>{certificate.description}</p>
              <small className={styles.documentLabel}>{supplierDocumentNotice(certificate.date)}</small>
              {"statusNote" in certificate ? <p className={styles.statusNote}>{certificate.statusNote}</p> : null}
              <a href={certificate.url} className="textLink" rel="noopener noreferrer">Open certificate PDF <span aria-hidden="true">↗</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="brand-reports" aria-labelledby="reports-heading">
        <div className={styles.sectionHeading}>
          <div><p className="eyebrow">Source documents</p><h2 id="reports-heading">Brand-published test reports</h2></div>
          <p>Read the original PDFs on the supplier&apos;s <a href={kasandrinosTransparencyUrl} className={styles.inlineLink}>Transparency page</a>. Each report applies to the sample it describes.</p>
        </div>
        <div className={styles.reportBoundary}><strong>Supplier-published documents</strong><p>These documents are background evidence. They do not report results for a VLE lot.</p></div>
        <ul className={styles.reports}>
          {kasandrinosReports.map((report) => (
            <li key={report.url}>
              <div><h3>{report.category}</h3><p>{report.subject}</p><small className={styles.documentLabel}>{supplierDocumentNotice(report.date)}</small></div>
              <a href={report.url} className="textLink" aria-label={`Open ${report.category}: ${report.subject} PDF`} rel="noopener noreferrer">Open PDF <span aria-hidden="true">↗</span></a>
            </li>
          ))}
        </ul>
      </section>

      <PublicCertifications profileId={profile.id} />
      <section className={styles.lotSection} id="vle-lot" aria-labelledby="lot-heading">
        <div className={styles.lotIntro}>
          <p className="eyebrow eyebrowLight">Lot-specific evidence</p>
          <h2 id="lot-heading">VLE lot</h2>
          <p>Each step stays Pending until its real record exists.</p>
          <p>Supplier-published reports do not advance this pipeline. No confirmed purchase, VLE test result, TECRID, qualification decision, or reservation has been recorded.</p>
        </div>
        <ol className={styles.steps}>
          {lotSteps.map((step, index) => (
            <li key={step.title}>
              <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div><div className={styles.stepHeading}><h3>{step.title}</h3><span className={styles.pending}>Pending</span></div><p>{step.detail}</p></div>
            </li>
          ))}
        </ol>
      </section>
      <section className={styles.claimSection} aria-label="Claim or takedown requests">
        <p>To claim this profile or request a takedown, email <a href="mailto:marcus@vle.exchange">marcus@vle.exchange</a>. Takedown requests are honoured within 5 business days.</p>
      </section>
      <div className={styles.sourceNote}>
        <p>Sources: <a href="https://www.kasandrinos.com/">Kasandrinos</a> product pages and <a href={kasandrinosTransparencyUrl}>Transparency page</a>. Documents checked 19 October 2026. Document labels use dates stated in the documents.</p>
        <p>Disclosure: Paleo Foundation also operates VLE.</p>
      </div>
    </main>
  );
}
