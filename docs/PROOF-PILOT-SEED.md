# Proof schema and held pilot seed

Migrations 0010-0012 create 11 tables in total (8 in 0010, 1 in 0011, 2 in 0012), their indexes, and the receipt stream column. They do not insert Kasandrinos pilot records.

The former 0010 seed statements are preserved unchanged in `scripts/seeds/kasandrinos-proof-pilot.sql`, outside the automatic migration path. This is a manual SQL script, with no package command or build/start/deployment hook. Do not run it without the separate GATE-SECURITY-E2E-1 pilot-data approval. It inserts up to 16 records: 1 team, 1 organization, 3 roles, 6 lots and 5 supplier-reported certification records. It is not an idempotent replay script; partial application requires a separate reviewed recovery decision.

Tests that require these records explicitly call a fixture helper against disposable local D1. The schema-only regression first runs all migrations without the helper and verifies empty pilot tables, then tests the optional seed independently. Recombining the split SQL reproduces original 0010 SHA256 `50ed381781449c4507d545ea1e70673932ae4de9bead824b5bacae8a1d3389af`.

0010 applied state = UNKNOWN from the ledger; inferred not-applied from absence of its 11 tables; re-confirm the D1 migrations ledger read-only at release time before any apply.

The preceding sentence is the required release caveat. The observed 11 absent tables span 0010-0012, rather than 0010 alone. Elon's 07:14 authorization permits this reversible draft edit based on that inference; it does not establish ledger state or authorize a production apply, seed, merge or release. Sites source access and publication remain behind Karen's GATE B HOLD. Existing runtime account-initialization behavior is unchanged by this migration-only split.
