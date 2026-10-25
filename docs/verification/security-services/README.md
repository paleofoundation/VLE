# F08 receiver verification

The first commit records four failures proving that the email relay credential authenticated report-service operations. The fix separates report reads, permission mutations, imports and notifications from mail and from each other. Actor assertions bind exact bodies and routes with short expiry and durable atomic nonce claims.

Nine new receiver/protocol checks, all existing VLE test files and production build pass. The paired protocol harness verifies the actual TECRID and VLE modules in both directions, accepts two requests and rejects both replays with zero external calls. `paired.json` records the common source SHA-256. Existing SQL is initialized only in disposable test databases. No schema or migration file changes.

Receiver rollout requires the matching TECRID sender PR and separately provisioned distinct credentials. Missing/reused keys and unavailable replay storage fail closed. Current mail delivery is unchanged; F11's mail issuance binding and broader budgets are separate. No production credential, original report, real mail, notification, merge or deployment was used. VLE proof receiver remains OFF.
