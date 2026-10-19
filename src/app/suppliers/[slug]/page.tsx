import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplier } from "@/lib/public-listings";
import { NonMemberBanner, DocumentSourceLabel, LotStatusSteps } from "@/components/listing";
import { SITE_URL } from "@/lib/site";
import { PublicCertifications } from "@/components/listing/certifications";
import styles from "@/components/listing/directory.module.css";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: PageProps<"/suppliers/[slug]">): Promise<Metadata> {
  const supplier = await getSupplier((await params).slug);
  if (!supplier) return { title: "Supplier profile unavailable | VLE", robots: { index: false } };
  return { title: `${supplier.displayName} | VLE`, description: `Read original supplier-published documents from ${supplier.displayName}. Public document access is free.`, alternates: { canonical: `${SITE_URL}/suppliers/${supplier.slug}` }, robots: { index: true, follow: true } };
}
export default async function SupplierPage({ params }: PageProps<"/suppliers/[slug]">) {
  const s = await getSupplier((await params).slug); if (!s) notFound();
  const products = [...new Set(s.documents.map((d) => d.productName).filter((p): p is string => !!p))];
  return <main id="main-content" className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: s.displayName, ...(s.website ? { url: s.website } : {}) }).replace(/</g, "\\u003c") }} />
    <Link className="back" href="/suppliers">← Suppliers</Link>
    <header className={styles.hero}><p className="eyebrow">{s.categories.join(" · ")}</p><h1>{s.displayName}</h1><p>{s.country ?? "Country not stated"}</p>{s.website ? <a className={styles.plainLink} href={s.website} rel="nofollow noopener noreferrer">{s.website}</a> : null}</header>
    {s.listingSource === "PUBLIC_DOCUMENTS" ? <NonMemberBanner slug={s.slug} /> : <span className={styles.chip}>VLE member</span>}
    <section className={styles.section}><h2>Products</h2>{products.length ? <ul className={styles.products}>{products.map((p) => <li key={p}>{p}</li>)}</ul> : <p>No products listed yet.</p>}</section>
    <section className={styles.section}><h2>Test documents</h2><p>Viewing documents is free and public. These files describe the reported samples and do not establish VLE lot qualification.</p>
      {s.documents.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Document and product</th><th>Lot / batch</th><th>Laboratory</th><th>Date and original source</th></tr></thead><tbody>{s.documents.map((d) => <tr key={d.id}>
        <td><strong>{d.docType}</strong><p>{d.productName}</p><p>{d.testsText}</p></td><td>{d.lotOrBatch ?? "Not stated"}</td><td>{d.labName ?? "Lab not named on document"}<small>Accreditation as stated: {d.labAccreditationAsStated ?? "Not stated"}</small></td><td>{d.reportDate ?? d.reportDateText ?? "Date not stated"}<DocumentSourceLabel domain={d.sourceDomain} date={d.foundAt} sourcePageUrl={d.sourcePageUrl} /><a href={d.sourceUrl} rel="nofollow noopener noreferrer">Open original document ↗</a></td>
      </tr>)}</tbody></table></div> : <p className={styles.empty}>No public documents listed yet.</p>}
    </section>
    <section className={styles.section}><h2>Certifications shown by supplier</h2><p>Supplier-reported. {s.certificationsShown ?? "No certifications stated."}</p></section>
    <PublicCertifications profileId={s.id} />
    <section className={styles.section}><h2>VLE lot status</h2><p>Each step needs a real lot-specific record. Supplier-published documents do not advance these steps.</p><LotStatusSteps /></section>
    <div className={styles.actions}>{s.listingSource === "PUBLIC_DOCUMENTS" ? <span aria-disabled="true">Ask VLE to invite this supplier (requests opening soon)</span> : ["document", "sample", "quote"].map((t) => <span key={t} aria-disabled="true">Request a {t} (requests opening soon)</span>)}</div>
    <section className={styles.section}><h2>Is this your company?</h2><p>To claim this profile or request a takedown, use the <Link className={styles.plainLink} href={`/claim/${s.slug}`}>claim form</Link> or email <a className={styles.plainLink} href="mailto:marcus@vle.exchange">marcus@vle.exchange</a>. Takedown requests are honoured within 5 business days.</p><Link className="textLink" href={`/takedown?profile=${s.slug}`}>Request a takedown</Link></section>
    <p>Disclosure: Paleo Foundation also operates VLE.</p>
  </main>;
}
