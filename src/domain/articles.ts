import { ARTICLE_PATHS, type PublicSitemapPath } from "../lib/site";

export const ARTICLE_PUBLISHED_ON = "2026-10-15";

export type ArticleSource = {
  label: string;
  href: string;
};

export type ArticleSection = {
  heading: string;
  paragraphs: readonly string[];
};

export type VleArticle = {
  slug: string;
  path: PublicSitemapPath;
  title: string;
  description: string;
  datePublished: typeof ARTICLE_PUBLISHED_ON;
  sections: readonly ArticleSection[];
  sources: readonly ArticleSource[];
};

const houseReport: ArticleSource = {
  label: "U.S. House Subcommittee on Economic and Consumer Policy, staff report, 4 February 2021",
  href: "https://oversightdemocrats.house.gov/imo/media/doc/2021-02-04%20ECP%20Baby%20Food%20Staff%20Report.pdf",
};

const houseRelease: ArticleSource = {
  label: "U.S. House Committee on Oversight, press release, 4 February 2021",
  href: "https://oversightdemocrats.house.gov/news/press-releases/oversight-subcommittee-staff-report-reveals-top-baby-foods-contain-dangerous",
};

const closerToZero: ArticleSource = {
  label: "FDA, Closer to Zero: Reducing Childhood Exposure to Contaminants from Foods",
  href: "https://www.fda.gov/food/environmental-contaminants-food/closer-zero-reducing-childhood-exposure-contaminants-foods",
};

const eu2023915: ArticleSource = {
  label: "Commission Regulation (EU) 2023/915 of 25 April 2023",
  href: "https://eur-lex.europa.eu/eli/reg/2023/915/oj",
};

const articlesData = [
  {
    slug: "not-a-supplier-directory",
    title: "VLE is not an ordinary ingredient supplier marketplace",
    description:
      "A directory lists companies and product pages. VLE records a category standard, a retest schedule, and only the lots that have a published record against that standard.",
    sections: [
      {
        heading: "A directory sells access to a supplier",
        paragraphs: [
          "An ordinary ingredient supplier marketplace is a directory. It lists companies, product names, and a way to start a conversation. The thing on offer is access to a supplier. A label that says tested often sits on the company or on the product page.",
          "That label does not have to name the lot in the warehouse, the contaminant, the number, the method, the laboratory, the date, or the limit. The page can still look complete. A buyer who needs to check a lot has nowhere to go.",
        ],
      },
      {
        heading: "VLE records a different object",
        paragraphs: [
          "VLE's claim is a standard for a category, with scheduled retesting of the lots that enter that category. A compliance profile is the category standard. A physical lot is one stock of one ingredient. A supplier file, a sample, a TECRID evidence record, and a qualification decision stay separate records.",
          "A lot appears in public only while its own gate is clear: identity, inventory authority, a controlled sample, current TECRID-linked evidence, and a QUALIFIED decision against one frozen profile version. The decision names that lot and that version. It does not travel to the next lot, to a transformed ingredient, or to a finished product.",
        ],
      },
      {
        heading: "Empty stays empty",
        paragraphs: [
          "A directory can be large and still hold nothing a buyer can check on the day a contaminant question arrives. VLE can be small and still show the category standard, the lot identity, and the documents a supplier has actually attached.",
          "If a document is missing, the list is empty. VLE does not fill the gap with a sample result. VLE does not describe lots outside the schedule as passed.",
        ],
      },
    ],
    sources: [eu2023915, closerToZero],
  },
  {
    slug: "tested-without-a-public-result",
    title: "\"Tested\" is not a result",
    description:
      "A category claim that a product was tested, with no public analyte, number, method, date, lot identity, or limit, gives a buyer nothing to check.",
    sections: [
      {
        heading: "The word stands in for the record",
        paragraphs: [
          "The word tested, printed on a product page, is a category habit. It does not say which analyte was measured. It does not give the number. It does not name the method, the laboratory, the date, or the lot code. It does not cite a limit.",
          "A buyer cannot separate a pass from a page that never contained a result. The adjective does the work that a public record was supposed to do. That is the norm VLE is built against.",
        ],
      },
      {
        heading: "A standard is a text someone else can open",
        paragraphs: [
          "A real standard has a text a third party can open. Commission Regulation (EU) 2023/915 sets maximum levels for listed contaminants in listed food categories. Food above the level set for its category is not to be placed on the market. The levels are public. They are category ceilings, not a private slogan.",
          "FDA Closer to Zero is another public text. It is the agency program to reduce exposure to arsenic, lead, cadmium, and mercury in foods eaten by babies and young children. It works through category action levels. An action level is not a laboratory printout for one ingredient lot, and it is not the word tested.",
        ],
      },
      {
        heading: "A file reference is still not a number",
        paragraphs: [
          "VLE will store a supplier file reference for a named documentation type, on one lot or one profile, when the supplier provides the file name and an https link. Heavy metals, PFAS, and microplastics are separate types. Each type points at its Institute of Contaminant Standards index.",
          "VLE does not invent the number that file might contain. A reference with no qualification decision does not put a lot on the shelf. Scheduled retesting is a date the supplier records, or a blank. The blank is not a pass.",
        ],
      },
    ],
    sources: [eu2023915, closerToZero],
  },
  {
    slug: "contamination-crisis-needs-a-lot",
    title: "A contamination crisis asks which lot",
    description:
      "The 2021 U.S. House baby food staff report and FDA Closer to Zero show the same gap: internal or category-level metals information is not a public result for the lot a buyer is about to take.",
    sections: [
      {
        heading: "The results were inside the companies",
        paragraphs: [
          "On 4 February 2021 the Subcommittee on Economic and Consumer Policy, of the U.S. House Committee on Oversight and Reform, released a staff report titled \"Baby Foods Are Tainted with Dangerous Levels of Arsenic, Lead, Cadmium, and Mercury.\" The subcommittee had requested internal documents and test results from large baby food manufacturers. Those results were not already a public lot file.",
          "The subcommittee's public summary was specific. Responding manufacturers set their own internal limits for inorganic arsenic, lead, cadmium, and mercury. The subcommittee called those limits dangerously high. It reported that manufacturers sold products above the limits they had set. It reported that the prevalent practice was to test ingredients and not the finished food, which concealed higher levels in the food that was sold.",
        ],
      },
      {
        heading: "One public number, then a program",
        paragraphs: [
          "The staff report stated that, at that date, FDA had finalized one numeric standard for these metals in baby food: 100 ppb inorganic arsenic in infant rice cereal. Limits for lead, cadmium, and mercury in baby food were not in place as finalized standards. Parents and buyers could not look up the lot.",
          "FDA later published Closer to Zero, a program to reduce childhood exposure to arsenic, lead, cadmium, and mercury from foods. The program moves through research, action levels for a food category, and compliance activity. An action level applies to a category. It does not identify the ingredient lot in a named warehouse, and it does not publish that lot's laboratory result.",
        ],
      },
      {
        heading: "What the supplier page cannot answer",
        paragraphs: [
          "A buyer in that kind of crisis, holding a page that says tested, cannot answer the questions the report forced into public view. Which lot. Which metal. Which number. Which limit. Which date. The internal file answered some of those questions for the company that held it. It did not answer them for the buyer.",
          "Sourcing that stops at a supplier directory fails there. The category norm is the failure: a tested claim with no public result and no real standard. VLE's claim stays narrower. A standard per category. Scheduled retesting for lots placed on that schedule. A published record only where a record exists.",
        ],
      },
    ],
    sources: [houseReport, houseRelease, closerToZero],
  },
  {
    slug: "category-standard-and-retesting",
    title: "A standard per category, and a retest schedule",
    description:
      "Regulation (EU) 2023/915 sets maximum levels by food category. VLE's claim has that shape: a named standard for a category, and scheduled retesting for lots that enter it.",
    sections: [
      {
        heading: "The regulation is a category ceiling",
        paragraphs: [
          "Commission Regulation (EU) 2023/915 of 25 April 2023 sets maximum levels for certain contaminants in food and repeals Regulation (EC) No 1881/2006. Annex I is organized by contaminant and by food category. Specified cocoa and chocolate categories have cadmium maxima. Specified foods of animal origin have maxima for certain PFAS. The regulation does not set a particle limit for microplastics.",
          "The regulation does not publish the laboratory result for each commercial lot offered for sale. The rule is a ceiling for a category. Official controls, and the checks an operator runs, sit under that ceiling. They are not the same object as a public file for one lot.",
        ],
      },
      {
        heading: "What VLE claims",
        paragraphs: [
          "VLE's claim follows that shape and then names the lot when the lot is actually in scope. There is a standard per category: the frozen compliance profile for that ingredient. There is scheduled retesting for lots placed on that schedule. A supplier can record a retest date on a contaminant document. If no date is supplied, the field stays empty.",
          "VLE does not claim universal testing of lots a supplier happens to hold. A lot with no schedule and no qualification decision is not described as tested. A decision, when one exists, names the frozen profile version and the identified lot.",
        ],
      },
      {
        heading: "Retesting is a date, not a slogan",
        paragraphs: [
          "A retest date on a heavy metals, PFAS, or microplastics document is the supplier's statement of when that reference is due again. It is optional because VLE will not invent a calendar. Three documentation types do not share one date. A metals retest says nothing about PFAS or microplastics.",
          "The date does not qualify the lot. Qualification still requires the publication gate: identity, inventory authority, a controlled sample, current TECRID-linked evidence, and a QUALIFIED decision against the frozen profile. Scheduled retesting tells a buyer when the category standard expects another look. It is not a claim that every stock was already measured.",
        ],
      },
    ],
    sources: [eu2023915, closerToZero],
  },
  {
    slug: "what-a-buyer-can-check",
    title: "What a buyer can check on a lot",
    description:
      "Heavy metals, PFAS, and microplastics are separate documentation types. Each links to an Institute of Contaminant Standards index. A file reference is not a qualification decision.",
    sections: [
      {
        heading: "Three types, three indexes",
        paragraphs: [
          "Heavy metals, PFAS (forever chemicals), and microplastics are three documentation types. They are not synonyms. A metals file says nothing about PFAS. A PFAS file says nothing about microplastics. Each type has a short explainer and a link to its Institute of Contaminant Standards index: the Heavy Metal Index, the Forever Chemicals Index, and the Microplastics Index.",
          "The indexes are external. VLE does not copy their tables into a lot and does not treat a link as a result for that lot.",
        ],
      },
      {
        heading: "What the attachment holds",
        paragraphs: [
          "A supplier may attach a file reference to one physical lot or to one compliance profile. The record holds the type, the file name, an https reference, an optional document date, an optional retest date, and optional notes. It does not hold a concentration, a particle count, or a pass flag.",
          "Attaching the file does not verify inventory, create a sample, mint TECRID evidence, or qualify the lot. The supplier desk is where the reference is saved. The public shelf still waits on the qualification gate.",
        ],
      },
      {
        heading: "Read the blanks",
        paragraphs: [
          "A buyer can check the category standard, whether a retest date is on file, whether a document of a given type is attached to that lot or that profile, and where the file is stored. The buyer can also check whether that lot has a separate qualification decision against the frozen profile.",
          "If a line is empty, VLE does not have the record. The empty line is not a pass. TECRID verification is a separate recommendation: verified suppliers rank higher in brand matching, and the match itself is not computed on the article page or the supplier profile.",
        ],
      },
    ],
    sources: [houseReport, eu2023915, closerToZero],
  },
] as const;

function articlePath(slug: (typeof articlesData)[number]["slug"]): PublicSitemapPath {
  const path = `/articles/${slug}`;
  const match = ARTICLE_PATHS.find((entry) => entry === path);
  if (!match) throw new Error(`Article path is not in the public sitemap: ${path}`);
  return match;
}

export const articles: readonly VleArticle[] = articlesData.map((article) => ({
  ...article,
  path: articlePath(article.slug),
  datePublished: ARTICLE_PUBLISHED_ON,
}));

export type ArticleSlug = (typeof articlesData)[number]["slug"];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug) ?? null;
}

export function articlePlainText(article: VleArticle) {
  return [
    article.title,
    article.description,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ...article.sources.map((source) => source.label),
  ].join("\n");
}
