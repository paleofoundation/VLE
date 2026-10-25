# F12: transactional team audit

Two failing regressions precede the fix. Every explicit team grant/revoke and domain-suggestion change now appends an actor/action/subject event in the same D1 batch as the mutation. Team creation and the previously authorized founding assignment are also recorded; initialization is recorded once with its marker. Already revoked memberships remain idempotent. Failed/stale writes cannot create a success event, and an injected audit outage rolls the permission mutation back.

Focused actor/count/rollback tests, all VLE test files and build pass, with focused lint and whitespace. Events use existing proof_audit storage with append-only application writes; no client mutation API or secret/result payload is introduced. Direct database administrator tampering is not claimed to be prevented. No schema or migration file changes. All fixture teams/databases are synthetic and disposable. Draft only, no production data, real messages, merge or deploy.
