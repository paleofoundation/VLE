import Link from "next/link";
import { ContaminantTypeList } from "../contaminant-type-list";
import { PageStructuredData } from "../page-structured-data";
import { publicPageMetadata } from "@/lib/seo";
import { seoJsonLdPages } from "@/lib/structured-data";

const page = seoJsonLdPages["/contaminants"];

export const metadata = publicPageMetadata("/contaminants", page.name, page.description);

export default function ContaminantsPage() {
  return (
    <main id="main-content" className="contaminantPage">
      <PageStructuredData path="/contaminants" />
      <section className="articleHero" aria-labelledby="contaminants-heading">
        <div>
          <p className="eyebrow eyebrowLight">Contaminant documentation</p>
          <h1 id="contaminants-heading">Three documentation types. No invented results.</h1>
          <p>Suppliers can attach a PDF or an https reference for heavy metals, PFAS, or microplastics to one physical lot or one compliance profile. Each type has a short explainer and a link to its evidence index or the Institute of Contaminant Standards microplastics page while that index is in development.</p>
        </div>
      </section>
      <section className="contaminantBody" aria-labelledby="type-heading">
        <div className="articleIntro">
          <p className="eyebrow">Documentation types</p>
          <h2 id="type-heading">A document is not a qualification.</h2>
          <p>The claim VLE makes is a standard per product category with scheduled retesting. Attaching a document records a PDF or a reference. VLE does not extract a concentration, a particle count, or a qualification decision from it.</p>
        </div>
        <ContaminantTypeList />
        <div className="articleClose">
          <p>Signed-in suppliers attach documents from the supplier desk. This page does not accept files and does not list sample results.</p>
          <div className="actions">
            <Link className="button buttonDark" href="/supplier">Open the supplier desk</Link>
            <Link className="textLink" href="/articles/what-a-buyer-can-check">What a buyer can check</Link>
            <Link className="textLink" href="/for-suppliers">Supplier onboarding</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
