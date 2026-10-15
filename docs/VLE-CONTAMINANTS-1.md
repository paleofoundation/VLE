# VLE-CONTAMINANTS-1 draft

Repository identity: origin/main at `40e95cca5b4b035f4651b10ac3c2360441ab7110` identifies the primary domain as vle.exchange in README.md. This branch builds on its existing HEAVY_METALS, PFAS and MICROPLASTICS catalog, contaminant_documents table, supplier reference form, public supplier display and operations display. It does not duplicate those features or rerun their migration.

## Behavior and UI description

At `/supplier`, the supplier selects a documentation type and one physical lot or compliance profile. A new Document source selector offers Upload a PDF or Record an https reference. Only the chosen subject and source fields are rendered. PDF uploads use the original filename, accept nonempty PDFs up to 512 KiB and require a PDF signature and media type. The existing reference path remains available for larger files. The cap is an operational upload bound, not a contaminant threshold.

Document date and retest date remain optional. Invalid calendar dates are rejected instead of silently discarded. The form shows validation errors, a pending button and a success message. It explicitly explains public metadata, reference-link visibility and private PDF contents. Saving a document does not extract measurements, set limits, qualify a lot, create evidence or list a product.

The supplier log and operations lot view offer Download uploaded PDF for uploaded records and retain Open stored reference for old links. Each documentation type links to its context: HMI for heavy metals, FCI for PFAS, and `https://contaminantstandards.com/network/microplastics` until the microplastics index is live. The ICS fallback is prepared by contaminantstandards draft PR #2 and must be available before activating this VLE draft. The requested FCI link is retained without asserting that the reserved index has deployed.

Public supplier profiles show document metadata and the context link. Uploaded bytes are excluded from public, desk and compliance-pack selections. Public profiles state that uploaded PDFs are accessible to the supplier and operations. Existing externally hosted reference links retain their current public behavior.

## Storage and access

The implementation reuses the existing Postgres database. No storage service, Vercel project, environment variable or credential is added. PDF bytes use bytea with a stored size and media type. Download uses `/api/contaminant-documents/[id]`, resolves the current actor, restricts access to SUPPLIER/OPS/ADMIN, and checks the owning organization before selecting bytes. Cross-supplier and buyer reads are denied. Responses are attachments with sanitized filenames, no-store, nosniff and a sandbox policy.

The attachment and existing audit event are written in one transaction. No raw file content or external reference URL is put in the audit event. This is bounded document attachment, not Q7 sharing codes, buyer access, supplier access-rule management or a malware-verification service.

## Migration notes

`drizzle/0005_contaminant_pdf_uploads.sql` is a generated draft with its snapshot and journal entry. It makes reference_url nullable and adds file_content, file_size and content_type. A CHECK constraint requires exactly one source: an existing reference without file fields, or a PDF upload with matching byte length, bounded size and media type. Existing reference rows remain valid and unchanged. The prior subject and lot-owner constraints remain in force.

No production or remote database was connected, migrated or seeded. Tests apply migrations 0000 through 0005 only to disposable in-memory Postgres with synthetic fixtures. Deployment requires a separately authorized migration first. To roll back before any upload is accepted, remove the new constraint/columns and restore reference_url NOT NULL. After uploads exist, do not drop the bytes or restore NOT NULL without an approved export/retention plan; rollback would otherwise destroy files or fail on upload rows.

## Validation

- Initial clean-clone `npm run check`: lint passed; typecheck stopped on nine existing PageProps errors because Next route types had not been generated. Tests did not run in that command. This was not fixed in application code.
- Pristine origin/main archive: tests 74 PASS / 3 skipped; production build PASS; check after build PASS. The three skipped tests require an external database and were not enabled.
- Final draft: `npm run check` PASS, including full ESLint, TypeScript and 83 tests; 3 existing external-database tests skipped. `npm run build` PASS.
- New tests exercise form validation, all three types, migration compatibility, real in-memory SQL constraints, byte round-trip, attachment audit, unchanged lot/evidence/listing state, tenant and role denial, missing documents, no public byte leakage, and form action through storage to download with attachment/no-store headers.
- PGlite is a development-only dependency for isolated Postgres tests; test authentication is explicitly mocked. No real supplier records or production credentials were used.
- Whitespace and changed-file terminology scans PASS.
- No browser screenshot or authenticated live-environment pass is claimed. Local browser access was denied by browser security policy during this run. UI behavior is described above; the production build and server-side flow tests passed.

Raw logs: `../work/q5-baseline-check.log`, `q5-baseline-tests-confirmed.log`, `q5-baseline-build-confirmed.log`, `q5-baseline-check-confirmed.log`, `q5-check.log`, `q5-build.log`, `q5-generate.log`. An initial disposable archive build using a dependency symlink was rejected by Turbopack; installing cached dependencies inside the archive resolved that verification setup issue without changing repository code.

Draft only. No merge, deployment, production migration, project, domain, DNS or sibling repository edit. Q6 onward and the optional Q11 spec are not part of this PR.
