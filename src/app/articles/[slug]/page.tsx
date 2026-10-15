import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleJsonLd } from "../article-json-ld";
import { articles, getArticle } from "@/domain/articles";
import { articlePageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  return article ? articlePageMetadata(article) : { title: "Article unavailable | VLE" };
}

export default async function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  const published = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${article.datePublished}T00:00:00.000Z`));

  return (
    <main id="main-content" className="articlePage">
      <ArticleJsonLd article={article} />
      <div className="detailBreadcrumb">
        <Link className="back" href="/articles">Articles</Link>
        <span aria-hidden="true">/</span>
        <span>{article.title}</span>
      </div>
      <article>
        <header className="articleHeader">
          <p className="eyebrow">VLE · {published}</p>
          <h1>{article.title}</h1>
          <p>{article.description}</p>
        </header>
        {article.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
        <section className="articleSources" aria-label="Public sources">
          <h2>Public sources</h2>
          <ul>
            {article.sources.map((source) => (
              <li key={source.href}><a className="textLink" href={source.href} rel="noopener noreferrer">{source.label} <span aria-hidden="true">↗</span></a></li>
            ))}
          </ul>
          <p><Link className="textLink" href="/contaminants">Contaminant documentation types</Link></p>
        </section>
      </article>
    </main>
  );
}
