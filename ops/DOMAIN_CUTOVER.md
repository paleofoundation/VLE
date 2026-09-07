# `vle.exchange` production cutover

## Outcome and boundary

Move `vle.exchange` and `www.vle.exchange` from the temporary AWS lander to the production VLE application currently served at `https://vle-navy.vercel.app` by the linked Vercel project `karen-pendergrass-projects/vle` (`prj_YvwA335kDAvcdeELxXY9xP33xfpr`). The apex is canonical. Requests to `www.vle.exchange/:path*` receive a permanent `308` redirect to `https://vle.exchange/:path*` from `next.config.ts`.

This changes routing only. It does not change Profiles, listings, tenancy, qualification, TECRID credentials, or commercial scope. The application's EXAMPLE LIMITS and pilot-gate disclosures remain in the rendered pages.

## Observed pre-cutover state — 2026-09-07

- `vle.exchange` has A records `3.33.130.190` and `15.197.148.33` and serves the 114-byte parking response rather than the VLE app.
- `www.vle.exchange` is a CNAME to `vle.exchange`; HTTPS currently fails hostname negotiation because the lander does not present a certificate for `www`.
- `https://vle-navy.vercel.app` returns the real Next.js VLE home page.
- Neither `vle.exchange` nor `www.vle.exchange` is currently assigned to the Vercel project.

## Change plan

Use the Vercel project already linked by `.vercel/project.json`; do not create or auto-link a second project. Run CLI commands from the repository root and use the `karen-pendergrass-projects` team when prompted.

### 1. Prove the production artifact before DNS

1. Merge the approved cutover PR to `main` and wait for the `vle` production deployment to report **Ready**.
2. Confirm the linked target:

   ```bash
   vercel project inspect vle
   vercel inspect https://vle-navy.vercel.app
   ```

3. Open each route on the existing production URL and confirm the full PR-H application—not the lander—renders:

   - `https://vle-navy.vercel.app/`
   - `https://vle-navy.vercel.app/for-suppliers`
   - `https://vle-navy.vercel.app/for-buyers`
   - `https://vle-navy.vercel.app/for-laboratories`
   - `https://vle-navy.vercel.app/access`

4. Confirm the home and walkthroughs still display **EXAMPLE LIMITS ONLY** and `/access` preserves the reviewed Clerk mapping gate.

### 2. Attach both names to the correct project

Do this before altering DNS so Vercel knows which project may answer the names and can publish any ownership-verification challenge.

```bash
vercel domains add vle.exchange vle
vercel domains add www.vle.exchange vle
vercel domains inspect vle.exchange
vercel domains inspect www.vle.exchange
```

Equivalent dashboard path: **Vercel → Karen Pendergrass' projects → vle → Settings → Domains → Add Domain**. Add both names to the Production environment. Do not use `--force` unless Karen has first confirmed that any existing Vercel assignment is obsolete.

If Vercel reports that the domain belongs to another Vercel account or team, it will provide a `_vercel` TXT ownership challenge. Add exactly that TXT record at the current DNS provider, wait for it to resolve, then run the two `vercel domains inspect` commands again. Do not remove the lander records merely to satisfy ownership verification.

The inspection output is the authority for the final DNS values. Vercel's current general-purpose values are apex A `76.76.21.21` and subdomain CNAME `cname.vercel-dns-0.com`, but a project may receive a specific CNAME or IP. Use the values displayed for these two domains, not a copied value from another project.

### 3. Change only the web records at the authoritative DNS provider

Keep existing MX, email-verification, SPF, DKIM, DMARC, and unrelated TXT/CAA records. Do not change nameservers for this cutover.

1. If the provider permits it, lower the apex and `www` TTL to 300 seconds before the change.
2. Replace the two old apex lander A records:

   ```text
   DELETE  @    A      3.33.130.190
   DELETE  @    A      15.197.148.33
   ADD     @    A      <exact apex value from `vercel domains inspect vle.exchange`>
   ```

3. Replace the `www → vle.exchange` lander alias:

   ```text
   DELETE  www  CNAME  vle.exchange
   ADD     www  CNAME  <exact target from `vercel domains inspect www.vle.exchange`>
   ```

4. Remove any other A, AAAA, ALIAS, ANAME, forwarding, or parking record for `@` or `www` that conflicts with the two Vercel records. Leave unrelated subdomains untouched.
5. Save the zone and record the change time and previous values in the change ticket.

### 4. Verify DNS, project assignment, and SSL

Poll rather than repeatedly editing records. DNS caches may retain the old answers until their prior TTL expires.

```bash
dig +short A vle.exchange
dig +short AAAA vle.exchange
dig +short CNAME www.vle.exchange
vercel domains inspect vle.exchange
vercel domains inspect www.vle.exchange
curl -sS -I https://vle.exchange/
curl -sS -I https://www.vle.exchange/for-suppliers
```

Acceptance:

- Both Vercel domain inspections show a valid configuration for project `vle`.
- The apex resolves only to the Vercel value shown by inspection; `www` resolves to the Vercel CNAME target.
- Vercel automatically provisions certificates after DNS validation. `https://vle.exchange` completes TLS with no browser warning.
- `https://www.vle.exchange/for-suppliers` returns `308` with `Location: https://vle.exchange/for-suppliers`; the path is preserved.
- Do not manually upload a certificate unless Vercel automatic issuance has failed and the cause has been diagnosed. CAA restrictions, stale/conflicting DNS, or an unverified domain should be corrected first.

### 5. Karen's browser smoke checklist

- [ ] `https://vle.exchange/` — real VLE hero says “Buy the lot that already passed,” production nav is visible, and **EXAMPLE LIMITS ONLY** remains present.
- [ ] `https://vle.exchange/for-suppliers` — five-step supplier walkthrough loads.
- [ ] `https://vle.exchange/for-buyers` — five-step buyer walkthrough loads.
- [ ] `https://vle.exchange/for-laboratories` — sampling/custody/TECRID walkthrough loads and states that PDF/COA does not auto-QUALIFY.
- [ ] `https://vle.exchange/access` — Clerk sign-in or the reviewed PENDING MAPPING/active membership state loads; no tenant data is exposed before mapping.
- [ ] `https://www.vle.exchange/` — redirects once to `https://vle.exchange/` with a valid certificate.
- [ ] `https://www.vle.exchange/for-laboratories` — redirects once and preserves `/for-laboratories`.
- [ ] Browser developer tools show no failed first-party JavaScript/CSS requests and no redirect loop.
- [ ] Vercel production logs show no new application errors during the smoke pass.

Useful final checks:

```bash
curl -fsSL https://vle.exchange/ | rg -F "Buy the lot that already passed"
curl -fsSL https://vle.exchange/for-laboratories | rg -F "A PDF does not auto-QUALIFY a lot"
vercel logs --environment production --level error --since 15m
```

### 6. Retire the lander

After all smoke checks pass and both names have remained stable through at least one previous DNS TTL window:

1. Mark the AWS lander deployment retired and remove its custom-domain/forwarding association, if one exists.
2. Keep its last static source or deployment identifier in the change ticket for audit/rollback; do not leave it answering either VLE hostname.
3. Restore normal DNS TTLs after the observation window.
4. Do not remove either custom domain from Vercel. Future `main` production deployments should continue to receive both names automatically.

## Rollback before lander retirement

If the Vercel deployment, Clerk flow, or TLS cannot pass smoke tests, restore the two documented apex A records and the prior `www → vle.exchange` CNAME while the lander still exists. Confirm the old response returns, diagnose on the Vercel URL, and schedule a new cutover. Do not weaken application authorization, qualification gates, or HTTPS to make the cutover appear successful.

## Vercel references

- [Set up a custom domain](https://vercel.com/docs/domains/set-up-custom-domain)
- [Deploying and redirecting domains](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting)
- [Working with SSL certificates](https://vercel.com/docs/domains/working-with-ssl)
- [`vercel domains` CLI](https://vercel.com/docs/cli/domains)
