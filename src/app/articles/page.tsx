import Link from "next/link";
import { PageStructuredData } from "../page-structured-data";
import { articles } from "@/domain/articles";
import { publicPageMetadata } from "@/lib/seo";
import { seoJsonLdPages } from "@/lib/structured-data";

const page = seoJsonLdPages["/articles"];

export const metadata = publicPageMetadata("/articles", page.name, page.description);

export default function ArticlesPage() {
  return (
    <main id="main-content" className="articleIndex">
      <PageStructuredData path="/articles" />
      <section className="articleHero" aria-labelledby="articles-heading">
        <div>
          <p className="eyebrow eyebrowLight">Articles · 15 October 2026</p>
          <h1 id="articles-heading">The record, or the adjective.</h1>
          <p>Five notes on why VLE is not an ordinary ingredient supplier marketplace, and why sourcing without a published lot record fails when a contamination question arrives.</p>
        </div>
      </section>
      <section className="articleIndexList" aria-label="Article list">
        <ol>
          {articles.map((article, index) => (
            <li key={article.slug}>
              <span className="mono">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2><Link href={article.path}>{article.title}</Link></h2>
                <p>{article.description}</p>
              </div>
              <Link className="textLink" href={article.path}>Read <span aria-hidden="true">↗</span></Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
