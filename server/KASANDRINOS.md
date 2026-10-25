# Kasandrinos source evidence

First real supplier, imported from its official transparency page on 2026-10-21:
https://www.kasandrinos.com/pages/transparency

`kasandrinos-reports.json` pins the exact original PDF URL, byte count, SHA-256, report ID, sample description, page and lot scope. The PDF route is server-authorized for verified company-email brand buyers. Original source URLs and hashes are not included in anonymous/bootstrap projections. Files are fetched only from the fixed registry, checked for PDF signature, exact size and hash, and stored unchanged in private R2 under their hash. A changed source must be reviewed rather than silently substituted. No report is placed in public assets. Authenticated report opens record buyer identity and report/lot scope in D1 for the Kasandrinos supplier history.

## Lot matching

- 227 K/B: Light Labs 43301 (heavy metals), 43295 (glyphosate/AMPA), 43296 (phthalates), plus the shared acidity report. Tested sample: 250 mL bottle.
- 228 K/B: Light Labs 43298 (heavy metals), 43302 (bisphenols), 43297 (aluminum), plus the shared acidity report. Tested sample: 3 L can.
- 195 K/B: Light Labs 43300 (heavy metals), 43299 (bisphenols). Tested sample: 3 L bag in a box. It is not included in the acidity report's declared lot list.
- 219, 225, 226 K/B: the shared acidity report only. Package format is not stated and no heavy-metals result is assigned.
- Acidity report 12-4338/21.11.2025/EN, sample 2025-121742: page 2 declares 219, 225, 226, 227 and 228 K/B together. This is one analyzed sample, not five separate tests.
- World Olive Center C2526-00228: no printed lot number. Certificate suffix 00228 is not lot 228 K/B. It remains an unmatched harvest reference.
- Envirolabs -5-92-24: KASELL, sample label KB, 2024. No numbered lot. Historical reference, not linked to 2025/2026 lots.

## Confirmation, ownership and trade

The user authorized importing the website's published reports. A real lot is discoverable when an original report explicitly matches its lot; numerical result tables and automated limit comparisons remain pending supplier confirmation. Original full PDFs are available to signed-in brand buyers. Numerical values are not fabricated, converted to zero, or copied into the confirmed-value schema. Published source reports do not prove current stock.

The supplier account email is deliberately unassigned until the user supplies it. Contact emails printed in PDFs are not used to claim ownership. Self-service signup does not grant access to this supplier. Real inquiries, sample requests and reservations are blocked until supplier onboarding is connected; EXAMPLE transaction fixtures remain separate.

Wholesale price, MOQ, lead time and inventory were not supplied. No retail price is substituted. Anonymous visitors see the sign-in price gate; signed-in visitors see pending terms.

## Certifications

All are labeled Supplier-reported. Organic addendum issuer: Quality Assurance International. The 2021-2024 Paleo/Keto letter is historical, not a current claim. The Oregon Tilth spices certificate covers Ares Pepper/Zeus Blend through Total Food Package and is not applied to olive oil. Non-GMO and Kosher document scope and printed dates are shown without asserting independent issuer verification.

## Validation

`node tests/kasandrinos.mjs` checks the six lots, nine lot-linked reports, two unmatched analyses, five certification records, shared-sample scope, pending values/terms, blocked real trade, original-file integrity and private cache behavior.
