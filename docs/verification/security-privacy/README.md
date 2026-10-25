# F13: private notification content and errors

Three failing regressions precede the fix. Access-request mail and inbox alerts no longer include the requester's mailbox; details remain in the authenticated controller workspace. Sourcing mail sends one recipient per envelope, using stable per-recipient provider idempotency keys. Shared team recipients cannot see each other's addresses, and retries retain deduplication.

Unexpected route/database failures now use fixed log codes and generic error responses. Async dispatch awaits keep failures inside those redacted boundaries. Authentication-library logging is disabled so rejected origins/provider errors cannot echo uncontrolled data. Normal status/authorization checks and in-workspace requester details remain available.

Focused notification/envelope/injected-error regressions, all VLE suites and build pass. Focused JavaScript lint and whitespace pass. All mailboxes/data are synthetic and transports intercepted. No actual message, production account/data, schema/migration, merge or deploy was used. This is source/local verification; deployed telemetry still requires the later rehearsal.
