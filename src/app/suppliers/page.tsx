import Link from "next/link";
import { PageStructuredData } from "../page-structured-data";
import { TecridVerificationNudge } from "../tecrid-nudge";
import { publicPageMetadata } from "@/lib/seo";
import { seoJsonLdPages } from "@/lib/structured-data";
import styles from "./suppliers.module.css";

const page = seoJsonLdPages["/suppliers"];

export const metadata = publicPageMetadata("/suppliers", page.name, page.description);

export default function SupplierProfilesPage() {
  return (
    <main id="main-content" className="supplierProfilePage">
      <PageStructuredData path="/suppliers" />
      <section className="articleHero" aria-labelledby="supplier-profiles-heading">
        <div>
          <p className="eyebrow eyebrowLight">Supplier profiles</p>
          <h1 id="supplier-profiles-heading">Meet the supplier. Follow the evidence.</h1>
          <p>Explore supplier products, published source documents, and the status of their VLE lots. A supplier profile does not establish lot qualification.</p>
        </div>
      </section>
      <section className={styles.directory} aria-label="Supplier directory">
        <Link className={styles.card} href="/suppliers/kasandrinos">
          <div className={styles.copy}>
            <p className="eyebrow">Greece · Organic extra virgin olive oil</p>
            <h2>Kasandrinos</h2>
            <p className={styles.legalName}>Kasandrinos International LLC</p>
            <p>Family-grown olive oil from Greece. Products, brand-published certifications and test reports, and a pending VLE lot.</p>
            <span className={styles.status}>VLE lot: Pending</span>
            <span className="textLink">View supplier profile <span aria-hidden="true">↗</span></span>
          </div>
        </Link>
      </section>
      <TecridVerificationNudge surface="profile" />
      <section className="supplierProfileBody">
        <h2>What a profile shows</h2>
        <ul>
          <li>The supplier organization name.</li>
          <li>Contaminant documents attached to that organization&apos;s lots or to a compliance profile, if any exist.</li>
          <li>The TECRID verification recommendation and any recorded lot-specific evidence.</li>
        </ul>
        <p>Brand-published documents are labeled separately from VLE lot evidence. An empty document list on a profile means no file has been recorded.</p>
        <div className="actions">
          <Link className="button buttonDark" href="/for-suppliers">Supplier onboarding</Link>
          <Link className="textLink" href="/contaminants">Documentation types</Link>
          <Link className="textLink" href="/access">Request reviewed access</Link>
        </div>
      </section>
    </main>
  );
}
