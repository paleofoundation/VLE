# Q6 article drafts

Order: VLE-ARTICLES-1. Editorial review only. These Markdown files are not imported by the application, listed in a sitemap, or assigned publication dates. Main currently serves shorter articles from `src/domain/articles.ts`; it has no content directory. This draft collection uses the order's `content/articles/` fallback and retains the corresponding existing slugs for review continuity.

Each article has its own `SOURCES.csv`. Body counts include title, section headings and visible inline citation labels, excluding frontmatter and the Sources section. Counts use whitespace-separated words after removing Markdown link syntax.

| Draft | Words | Outline |
| --- | ---: | --- |
| [Tested is not a result](tested-without-a-public-result/article.md) | 922 | Scope of testing; method context; accessible standards; support for public claims; evidence boundaries |
| [A contamination crisis](contamination-crisis-needs-a-lot/article.md) | 954 | Verified incident; illustrative response workflow; traceability; visible gaps; limits of preparation |
| [A category standard](category-standard-and-retesting/article.md) | 919 | Category applicability; decision rules; retest ownership; method capability; preserved standard versions |
| [Lot data and published limits](what-a-buyer-can-check/article.md) | 916 | Material identity; laboratory findings; scope of limits; reconstructable decisions; access boundaries |
| [How VLE works](not-a-supplier-directory/article.md) | 938 | Purchase question; distinct records; publication gate; standard version; obligations; bounded availability |

## Evidence review

External factual claims use six opened regulator sources: FDA guidance, investigation, follow-up response, traceability explanation and news release, plus an EFSA technical explanation. No paper, DOI, concentration, fee, testing interval or category ceiling has been invented. No commercial names from the incident pages have been reproduced.

The ledger separates external regulatory evidence from the internal product-model reference, read locally at main commit `40e95cca5b4b035f4651b10ac3c2360441ab7110`. Recommendations and illustrative sourcing questions are editorial analysis. They are not presented as legal requirements or measured outcomes. Product descriptions are repository-backed design statements, not a production or inventory audit. No unavailable future matching, access-control or certification feature is announced.

TODO, excluded from citations: the original EU contaminant regulation text did not render in the attempted official web access. No claim relies on it. No unverified lead is entered as a verified source.

## Review boundary

The claim throughout is a standard per product category with scheduled retesting. An attached document does not qualify material, a retest date does not establish a result, and a qualification decision does not certify a future finished product. No universal inventory-testing claim is made.

Before any later publication, editorial approval must confirm product availability and regulatory currency. Q6 authorizes this draft PR only. Application integration, public posting, deployment and changes to other queue items are outside this change.
