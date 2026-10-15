import { buildArticleJsonLd, jsonLdHtml } from "@/lib/structured-data";
import type { VleArticle } from "@/domain/articles";

export function ArticleJsonLd({ article }: { article: VleArticle }) {
  return (
    <script
      id={`article-structured-data-${article.slug}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(buildArticleJsonLd(article)) }}
    />
  );
}
