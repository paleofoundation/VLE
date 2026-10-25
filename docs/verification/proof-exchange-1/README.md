# Proof exchange verification

Local preview: http://127.0.0.1:5177. No hosted preview was deployed. To reproduce after installing dependencies, run `npm run build`, apply migrations to a local D1 database, and run `npm start -- --port 5177`.

The browser used the built app, a local D1 database containing only source-backed Kasandrinos catalog records, and an anonymous session. No synthetic credential or release was added to this preview database. Receiver and registry activation settings were absent. Native browser review used 1440 by 1000 and 390 by 844 viewports. There was no horizontal page overflow, anonymous Edit site pill, or Edit storefront link. Browser error log was empty.

- [Desktop proof wall](proof-wall-1440.jpg) and [phone proof wall](proof-wall-390.jpg).
- [Entire desktop profile](proof-wall-full-1440.jpg) and [entire phone profile](proof-wall-full-390.jpg), including the expired historical letter and spices-only scope.
- [Desktop home](home-1440.jpg) and [phone home](home-390.jpg). Hero markup and its existing styles are byte-identical to the base. The desktop feature begins at y=1028 with a 1000px viewport; the phone feature begins at y=1023 with an 844px viewport. No new role or supplier card enters the first screen. No claim is made that the inherited phone hero fits all its content above the fold.
- [Desktop lot](lot-1440.jpg) and [phone lot](lot-390.jpg). Existing sandbox TEST links and report authorization remain separate from production proof.
- [Storefront proof anchor](storefront-proof-1440.jpg). The existing supplier storefront includes its proof wall and five real certification documents.

The homepage feature click opens the Kasandrinos organization proof wall. The storefront Proof wall anchor scrolls to its wall. A signed-out visit to `/proof` asks the visitor to sign in. Authenticated role and release mutations are covered by real D1 integration tests rather than a live email login or external notification.

`proof-tests.txt`: 86 proof exchange checks pass. `worker-tests.txt`: the actual built Worker accepts a correctly signed synthetic delivery, returns a durable receipt, deduplicates retry, and exposes only its public metadata through anonymous bootstrap. It rejects unauthenticated writes. The isolated Worker test records zero outbound calls. These synthetic tests use disposable databases separate from the screenshot preview.

`existing-tests.txt`: all 13 preexisting test files pass. `homepage-tests.txt` and `storefront-tests.txt` record the affected UI regressions on the final source. `build.txt` records the successful production build. `source-preservation.json` records exact hero and disclosure preservation plus hashes for unchanged evidence, authorization and CSS files. Drizzle generation reports no schema changes after the committed migration and snapshots.

The receiver defaults off until TECRID step 4 confirms the provisional evidence envelope. Actual live registry status verification requires production endpoints and is not claimed. See [contract and behavior](../../PROOF-EXCHANGE.md).
