# F15 response boundaries

The red commit runs the built Worker and fails three assertions: missing nonce CSP/frame denial, missing private API cache boundaries, and missing fresh server-controlled policy. `red.txt` records that run. The implementation generates a 128-bit nonce before routing, overwrites client-supplied CSP, and lets Vinext attach the nonce to its trusted bootstrap scripts. It does not rewrite arbitrary script elements to grant them a nonce.

HTML has script nonces, same-origin scripts and connections, object denial, frame denial, no referrer, and private/no-store caching. Inline styles remain allowed because the application uses style attributes. Authenticated requests and API responses, including error responses, receive private/no-store and Cookie/Authorization Vary boundaries. Existing API CORS behavior stays closed. Static public assets keep their existing cache behavior.

`green.txt` has four passing built-Worker tests, including synthetic magic-link issuance, verification, protected reads, cross-origin read denial, and sign-out. Tests use disposable local D1, synthetic credentials and an intercepted outbound mail service. No real mail is sent. Session cookies retain Secure, HttpOnly and SameSite=Lax. The production build passes. No deployment, live-edge header check or browser CSP telemetry is claimed; those remain release verification.

Every existing VLE test file passes, as does the new header suite. The inline retry handler now uses the existing delegated action dispatcher so it works under the CSP. Focused ESLint and git diff checks pass.
