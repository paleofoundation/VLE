# ASTRA H

The FAQ is an ingredient sourcing guide for brands and QA managers. It has Rice, Cocoa, Protein, Spices, Tea and matcha, Olive oil, Baby food and General QA sections. No sourcing answers have been authored by the implementation.

The only content source is `/Users/kmfp/Documents/ChatGPT/vle-buildout/faq-sourcing.json`. That file was absent during implementation. The page therefore renders an explicit empty state and empty ingredient groups. The build imports the file verbatim when present; it does not fetch, generate or infer answers. The JSON bundled with this change contains only an empty groups array.

Content contract: `{ groups: [{ id, questions: [{ id, question, answer, sources: [{ number, title, url }], onVle: { label, href } }] }] }`. Group IDs: rice, cocoa, protein, spices, tea-and-matcha, olive-oil, baby-food, general-qa. Each answer requires unique numbered HTTPS sources and an On VLE link to `/suppliers` with a non-empty supported filter. Answer text is rendered as plain text. Invalid content fails the build import or shows an unavailable state locally, never an invented fallback.

FAQPage JSON-LD is generated from the same validated questions, answers, sources and search links. The empty state has no fabricated Question entities. Script payloads escape angle brackets.

Validation: lint, generated-route typecheck and production webpack build pass. 117 tests pass; 3 existing database integration tests skipped. The source file remains absent. Screenshots, browser click counts and Lighthouse checks are reserved for ASTRA ALL. No merge or production deployment.
