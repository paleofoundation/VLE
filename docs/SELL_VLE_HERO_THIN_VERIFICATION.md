# SELL-VLE-HERO-THIN verification

Date: 15 September 2026. Verified application commit: `9e479d1b0e9788ef5962eed3383cfe70c52d0673`.

- PR: https://github.com/paleofoundation/VLE/pull/26
- Verified deployment: https://vle-pdm9bykpe-karen-pendergrass-projects.vercel.app
- Deployment ID: `dpl_DC8yG8YB9MAwDPYSBXtKeNpxVeeC`, READY, Preview.
- Branch preview: https://vle-git-codex-sell-vle-1-karen-pendergrass-projects.vercel.app

## Result

The homepage hero contains one headline, the requested 17-word subtitle, one “Open pilot shelf” primary CTA, and one “PILOT · EXAMPLE limits” chip. The full EXAMPLE limitation follows the hero, immediately before the cocoa and avocado pilot shelf.

The existing shelf cards, chips, four gate steps, and claim boundary remain. A thin band after the lanes reads “Free TECRID trust · money on QUALIFIED / white-glove” beside “HMI → TECRID → VLE → HMTc”. Payment never buys qualification, listing eligibility, or authenticity. Demo records stay labeled, and the empty lane explains that the gate is working.

No stylesheet is changed or added. Existing typography, padding, gaps, and card styling are retained. The hero copy spans the column freed by removing the sidebar. The shared EXAMPLE notice explicitly requires an approved replacement frozen Profile version; the elapsed demonstration window does not authorize production use. Homepage text, including the footer, contains no em dashes.

## Build and review

- `npm run build`: passed.
- `npm run check`: lint and TypeScript passed; 58 tests passed, 3 existing database integration tests skipped.
- Independent source and claim review: no blocking findings.

## Local browser verification at 1280px

The production build ran at `http://localhost:3011`.

- 1280 × 720 viewport: one hero chip, one hero link, exact headline and subtitle, 17 subtitle words.
- The CTA ends at 621.6px; the hero ends and the EXAMPLE notice begins at 724px, below the 720px fold.
- No horizontal overflow and no em dashes in the rendered document.
- “Open pilot shelf” navigates to `#passed-lots`.
- Money/network band is 59px tall; both statements occupy one line.
- Computed styles were compared against the live production homepage at 1280px for the hero, headline, subtitle, button, lot card, card heading, status chip, four-step checklist, and lane. No typography, padding, gap, border, color, or background differences were found. Headline/subtitle width changes only because the sidebar was removed.

## Deployed preview verification

The deployed application was verified directly in the browser at 1280 × 720 using a temporary share link scoped to this deployment. Project protection settings were not relaxed.

- Exact headline and 17-word subtitle; one hero chip and one hero CTA.
- Hero bottom and EXAMPLE notice top: 724px, below the 720px fold. CTA bottom: 621.6px.
- No horizontal overflow; no em dashes in rendered text; no browser console errors.
- “Open pilot shelf” successfully navigated to `#passed-lots`.
- Cocoa retains its single labeled example publication record; avocado remains empty with the gate-working explanation and original four gate steps.
- Commercial/network band: 59px tall, both statements on one line.
- Computed typography, spacing, card, and chip styles match the 1280px live production baseline. Only headline/subtitle width changes with the removed sidebar.
- Live HTTP response: 200, with all requested messaging and claim boundaries present.
- Vercel deployment checks passed.

The PR remains open. Production was not merged or promoted. Subsequent verification documentation changes do not alter the verified application source.
