import { describe, expect, it } from "vitest";
import { ARTICLE_PATHS, absolutePublicUrl } from "../../lib/site";
import { buildArticleJsonLd } from "../../lib/structured-data";
import { articlePlainText, articles } from "../articles";

const hype = /\b(revolutionary|seamless|robust|cutting-edge|world-class|best-in-class|unparalleled|groundbreaking|next-generation|state-of-the-art|innovative|powerful|comprehensive|premium|elite)\b/i;
const competitors = /\b(knowde|ul\s?prospector|thomasnet|chemondis)\b/i;

describe("public articles", () => {
  it("publishes five sitemap articles with canonicals and Article JSON-LD", () => {
    expect(articles).toHaveLength(5);
    expect(articles.map((article) => article.path)).toEqual([...ARTICLE_PATHS]);
    for (const article of articles) {
      const data = buildArticleJsonLd(article);
      const articleNode = data["@graph"].find((node) => node["@type"] === "Article");
      const pageNode = data["@graph"].find((node) => node["@type"] === "WebPage");
      const canonical = absolutePublicUrl(article.path);
      expect(articleNode?.headline).toBe(article.title);
      expect(articleNode?.datePublished).toBe("2026-10-15");
      expect(articleNode?.mainEntityOfPage).toEqual({ "@id": `${canonical}#webpage` });
      expect(pageNode?.url).toBe(canonical);
      expect(JSON.stringify(data)).toContain("Paleo Certified Inc.");
      expect(JSON.stringify(data).toLowerCase()).not.toMatch(/\bpartners?|\bpartnerships?/);
    }
  });

  it("keeps the claim on a category standard with scheduled retesting and cites the public sources", () => {
    const corpus = articles.map(articlePlainText).join("\n");
    expect(corpus).toMatch(/standard per category|standard for a category/);
    expect(corpus.toLowerCase()).toContain("scheduled retesting");
    expect(corpus).not.toMatch(/every lot (is|was|has been) tested/i);
    expect(corpus).not.toMatch(/[\u2013\u2014]/);
    expect(corpus.toLowerCase()).not.toMatch(/\bpartners?|\bpartnerships?/);
    expect(corpus).not.toMatch(hype);
    expect(corpus).not.toMatch(competitors);
    const hrefs = articles.flatMap((article) => article.sources.map((source) => source.href));
    expect(hrefs).toContain("https://www.fda.gov/food/environmental-contaminants-food/closer-zero-reducing-childhood-exposure-contaminants-foods");
    expect(hrefs).toContain("https://oversightdemocrats.house.gov/imo/media/doc/2021-02-04%20ECP%20Baby%20Food%20Staff%20Report.pdf");
    expect(hrefs).toContain("https://eur-lex.europa.eu/eli/reg/2023/915/oj");
    expect(corpus).toContain("Closer to Zero");
    expect(corpus).toContain("2023/915");
    expect(corpus).toContain("4 February 2021");
  });
});
