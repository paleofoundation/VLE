import Image from "next/image";
import Link from "next/link";
import { publicPageMetadata } from "@/lib/seo";
import {
  brandReportNotice,
  kasandrinosCertifications,
  kasandrinosProducts,
  kasandrinosReports,
  kasandrinosTransparencyUrl,
} from "@/content/suppliers/kasandrinos";
import styles from "./profile.module.css";

export const metadata = publicPageMetadata(
  "/suppliers/kasandrinos",
  "Kasandrinos supplier profile | VLE",
  "Kasandrinos International LLC: family-grown organic extra virgin olive oil from Greece. Explore products, brand-published documents, and the pending VLE lot.",
);

// Advance a step only when a real, lot-specific record supports it.
// Brand-published reports below do not satisfy any of these steps.
const lotSteps = [
  { title: "Purchase in progress", detail: "500ml glass, 4 sealed bottles. Purchase confirmation and lot identity are pending." },
  { title: "Sample received at Light Labs", detail: "Awaiting the laboratory receipt and sample custody record." },
  { title: "Heavy-metals panel", detail: "Awaiting testing and the report for this VLE sample." },
  { title: "TECRID issued", detail: "Awaiting authenticated evidence bound to this lot." },
  { title: "QUALIFIED against the olive oil standard", detail: "Awaiting a qualification decision against the olive oil standard. This lot is not qualified or available for sourcing." },
] as const;

export default function KasandrinosSupplierPage() {
  return (
    <main id="main-content" className={styles.profile}>
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
        <div className={styles.heroImage}>
          <Image className={styles.logo} src="/suppliers/kasandrinos/logo.png" width={120} height={129} alt="Kasandrinos logo" preload />
          <div className={styles.bottle}>
            <Image src="/suppliers/kasandrinos/500ml.png" fill sizes="(max-width: 700px) 80vw, 360px" alt="Kasandrinos organic extra virgin olive oil in a 500ml glass bottle" preload />
          </div>
          <span className={styles.imageCaption}>Organic extra virgin olive oil</span>
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
          <p>Product details and photography from Kasandrinos. Each product links to the supplier&apos;s product page.</p>
        </div>
        <div className={styles.products}>
          {kasandrinosProducts.map((product) => (
            <a className={styles.product} key={product.url} href={product.url} rel="noopener noreferrer">
              <div className={styles.productImage}><Image src={product.image} fill sizes="(max-width: 700px) 44vw, (max-width: 1000px) 28vw, 23vw" alt={`Kasandrinos ${product.name}`} /></div>
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
        <div className={styles.reportBoundary}><strong>{brandReportNotice}</strong><p>These documents are background evidence. They do not report results for the pending VLE lot below.</p></div>
        <ul className={styles.reports}>
          {kasandrinosReports.map((report) => (
            <li key={report.url}>
              <div><h3>{report.category}</h3><p>{report.subject}</p><small>{brandReportNotice}</small></div>
              <a href={report.url} className="textLink" aria-label={`Open ${report.category}: ${report.subject} PDF`} rel="noopener noreferrer">Open PDF <span aria-hidden="true">↗</span></a>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.lotSection} id="vle-lot" aria-labelledby="lot-heading">
        <div className={styles.lotIntro}>
          <p className="eyebrow eyebrowLight">Lot-specific evidence</p>
          <h2 id="lot-heading">VLE lot</h2>
          <p className={styles.lotProduct}>500ml glass<br />4 sealed bottles</p>
          <p>Purchase in progress. Each step stays Pending until its real record exists.</p>
          <p>Brand-published reports do not advance this pipeline. No VLE test result, TECRID, or qualification decision has been recorded for this lot.</p>
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
      <div className={styles.sourceNote}>Sources: <a href="https://www.kasandrinos.com/">Kasandrinos</a> product pages and <a href={kasandrinosTransparencyUrl}>Transparency page</a>. Documents checked 19 October 2026.</div>
    </main>
  );
}
