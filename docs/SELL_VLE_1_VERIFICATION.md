# SELL-VLE-1 verification

Date: 15 September 2026. Application commit: `ebd5632`.

- PR: https://github.com/paleofoundation/VLE/pull/26
- Verified preview: https://vle-2tyj6krtx-karen-pendergrass-projects.vercel.app
- Vercel deployment: `dpl_2cC3ZkDKv29K8vzdaEVUcxTPmhqx`, READY, Preview.

## Result

The sell strip sits immediately above the pilot shelf. It connects the physical lot, independent sampling, authenticated evidence, and frozen-profile decision to supplier and buyer waste: rejects, dual labs, holds, and stuck inventory. It includes the proof-problem line and all six requested steps: nominate → freeze profile → sample → TECRID → QUALIFIED → reserve.

The existing Supplier · Buyer · Lab entry links to each benefit one-liner and then its existing walkthrough. TECRID core trust remains free forever, pilot entry remains free, and any future transaction charges follow QUALIFIED toward reserve. Optional white-glove terms are separate. Payment cannot buy qualification, eligibility, or evidence authenticity.

The elapsed 14 September demo window does not authorize production use. EXAMPLE status now explicitly depends on an approved replacement frozen profile. No profile values, inventory, service rules, credentials, checkout, or database records were introduced by this change.

## Build and review

- `npm run build`: passed.
- `npm run check`: lint and TypeScript passed; 58 tests passed, 3 existing database integration tests skipped.
- `git diff --check`: passed.
- Independent source and claim review: no blocking findings.

## Browser checks

The local production build ran at `http://localhost:3011` using the same application source as the preview.

- Desktop 1440px and mobile 390px: inspected the sell copy, wrapped buying path, persona benefits, and commercial copy; no horizontal overflow.
- Supplier entry → supplier benefit → `/for-suppliers`: passed.
- Buyer entry → buyer benefit → `/for-buyers`: passed.
- Lab entry → lab benefit → `/for-laboratories`: passed.
- Start with free access → `/join`: passed.
- All three walkthroughs retained their own pilot status rails and EXAMPLE notice.
- No console errors were captured during the completed navigation checks.

## Live preview checks

The deployed preview uses Vercel Authentication. Live responses were verified with the authenticated `vercel curl` path; browser layout and clicks were checked against the local production build. Deployment Protection was not changed.

HTTP 200 was confirmed for `/`, `/for-suppliers`, `/for-buyers`, `/for-laboratories`, `/join`, and both homepage stylesheets. Response checks confirmed:

- Sell strip precedes the pilot shelf.
- Physical evidence requirement, P&L waste, proof-problem copy, and all six steps are present.
- Free TECRID trust and commercial value after QUALIFIED remain distinct.
- All three persona anchors resolve to real target IDs and existing walkthrough links.
- All role pages and `/join` include the approval-dependent EXAMPLE notice.
- Demo records remain labeled; the empty avocado lane explains that the gate is working.
- Reservation intent remains cocoa-only and does not allocate stock or create an Order.
- Deployed CSS includes the sell strip and persona-entry styling.

The production apex was inspected before this change and still served the earlier homepage. This PR was not merged or promoted to production during this verification.
