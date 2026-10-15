import Link from "next/link";
import { PageStructuredData } from "../page-structured-data";
import { TecridVerificationNudge } from "../tecrid-nudge";
import { publicPageMetadata } from "@/lib/seo";
import { seoJsonLdPages } from "@/lib/structured-data";

const page = seoJsonLdPages["/suppliers"];

export const metadata = publicPageMetadata("/suppliers", page.name, page.description);

export default function SupplierProfilesPage() {
  return (
    <main id="main-content" className="supplierProfilePage">
      <PageStructuredData path="/suppliers" />
      <section className="articleHero" aria-labelledby="supplier-profiles-heading">
        <div>
          <p className="eyebrow eyebrowLight">Supplier profiles</p>
          <h1 id="supplier-profiles-heading">A profile names the organization. It does not invent a rank.</h1>
          <p>Each supplier organization has a profile at its slug. The profile lists contaminant file references that were actually attached. It does not list sample results, and it does not compute brand matching.</p>
        </div>
      </section>
      <TecridVerificationNudge surface="profile" />
      <section className="supplierProfileBody">
        <h2>What a profile shows</h2>
        <ul>
          <li>The supplier organization name.</li>
          <li>Contaminant documents attached to that organization&apos;s lots or to a compliance profile, if any exist.</li>
          <li>The TECRID verification recommendation. TECRID verification can break ties between offers with the same contamination grade.</li>
        </ul>
        <p>This index does not print a directory of organizations. An empty document list on a profile means no file has been recorded. VLE does not fill that list.</p>
        <div className="actions">
          <Link className="button buttonDark" href="/for-suppliers">Supplier onboarding</Link>
          <Link className="textLink" href="/contaminants">Documentation types</Link>
          <Link className="textLink" href="/access">Request reviewed access</Link>
        </div>
      </section>
    </main>
  );
}
