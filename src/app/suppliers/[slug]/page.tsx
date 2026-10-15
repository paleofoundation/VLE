import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TecridVerificationNudge } from "../../tecrid-nudge";
import { SITE_URL } from "@/lib/site";
import { contaminantDocumentationType } from "@/domain/contaminants";
import { getPublicSupplierProfile } from "@/services/contaminants";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
}

export async function generateMetadata({ params }: PageProps<"/suppliers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicSupplierProfile(slug);
  if (!profile) return { title: "Supplier profile unavailable | VLE" };
  const title = `${profile.organization.name} supplier profile | VLE`;
  const description = `Supplier profile for ${profile.organization.name}. TECRID verification is recommended. Verified suppliers rank higher in brand matching. Contaminant documents appear only when a reference is on file.`;
  const url = `${SITE_URL}/suppliers/${profile.organization.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { type: "website", siteName: "Verified Lot Exchange", title, description, url },
  };
}

export default async function SupplierProfilePage({ params }: PageProps<"/suppliers/[slug]">) {
  const { slug } = await params;
  const profile = await getPublicSupplierProfile(slug);
  if (!profile) notFound();

  return (
    <main id="main-content" className="supplierProfilePage">
      <div className="detailBreadcrumb">
        <Link className="back" href="/suppliers">Supplier profiles</Link>
        <span aria-hidden="true">/</span>
        <span>{profile.organization.name}</span>
      </div>
      <header className="articleHeader">
        <p className="eyebrow">Supplier profile</p>
        <h1>{profile.organization.name}</h1>
        <p>Contaminant documents below are file references this organization attached. VLE has not added results. A qualification decision, when one exists, stays on the lot.</p>
      </header>
      <TecridVerificationNudge surface="profile" />
      <section className="supplierProfileBody" aria-labelledby="profile-documents-heading">
        <h2 id="profile-documents-heading">Contaminant documents on file</h2>
        {profile.documents.length ? (
          <ol className="profileDocumentList">
            {profile.documents.map((document) => {
              const type = document.type ?? contaminantDocumentationType(document.documentationType);
              const subject = document.lotCode ? `Lot ${document.lotCode}` : document.profileName ? `Profile ${document.profileName}` : "Subject";
              return (
                <li key={document.id}>
                  <span className="mono">{type?.name ?? document.documentationType}</span>
                  <strong>{document.fileName}</strong>
                  <p>{subject}. {document.documentDate ? `Document dated ${formatDate(document.documentDate)}. ` : ""}{document.retestOn ? `Retest ${formatDate(document.retestOn)}.` : "No retest date recorded."}</p>
                  {type ? <a className="textLink" href={type.indexUrl} rel="noopener noreferrer">{type.indexName}</a> : null}
                  <a className="textLink" href={document.referenceUrl} rel="noopener noreferrer nofollow">Open reference</a>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="artifactEmpty">
            <strong>No contaminant document is attached to this supplier profile.</strong>
            <p>An empty list means no file has been recorded. It is not a test result, and it is not a statement that lots were tested.</p>
          </div>
        )}
        <p><Link className="textLink" href="/contaminants">Read the three documentation types</Link></p>
      </section>
    </main>
  );
}
