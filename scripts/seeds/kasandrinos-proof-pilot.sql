-- HOLD: operational pilot data requires separate GATE-SECURITY-E2E-1 approval.
-- Explicit manual seed only. Never include this file in the migration directory,
-- build, start, deployment or automatic database initialization.
-- Requires schema migrations 0010-0012. Not safe to replay after a partial seed.
-- Seed statements (unchanged from 0010):
INSERT OR IGNORE INTO team_accounts (id,name,kind,owner_email,contact_email,supplier_key,created_at) VALUES ('kasandrinos-team','Kasandrinos','supplier','karen@paleofoundation.com','karen@paleofoundation.com','kasandrinos',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
--> statement-breakpoint
INSERT INTO proof_organizations VALUES ('kasandrinos-team','kasandrinos-team','kasandrinos','Kasandrinos');
--> statement-breakpoint
INSERT INTO organization_roles VALUES ('kasandrinos-team','supplier'),('kasandrinos-team','brand'),('kasandrinos-team','private_label_manufacturer');

--> statement-breakpoint
INSERT INTO proof_lots VALUES ('KAS-227-KB','kasandrinos-team','227 K/B',NULL,NULL,'Organic extra virgin olive oil');

--> statement-breakpoint
INSERT INTO proof_lots VALUES ('KAS-228-KB','kasandrinos-team','228 K/B',NULL,NULL,'Organic extra virgin olive oil');

--> statement-breakpoint
INSERT INTO proof_lots VALUES ('KAS-195-KB','kasandrinos-team','195 K/B',NULL,NULL,'Organic extra virgin olive oil');

--> statement-breakpoint
INSERT INTO proof_lots VALUES ('KAS-219-KB','kasandrinos-team','219 K/B',NULL,NULL,'Organic extra virgin olive oil');

--> statement-breakpoint
INSERT INTO proof_lots VALUES ('KAS-225-KB','kasandrinos-team','225 K/B',NULL,NULL,'Organic extra virgin olive oil');

--> statement-breakpoint
INSERT INTO proof_lots VALUES ('KAS-226-KB','kasandrinos-team','226 K/B',NULL,NULL,'Organic extra virgin olive oil');

--> statement-breakpoint
INSERT INTO proof_certifications VALUES ('organic-addendum','kasandrinos-team',NULL,'Organic handling product addendum','Organic handling','Quality Assurance International',NULL,NULL,'Organic handling product addendum','2025-11-14T00:00:00.000Z',NULL,'unknown','organic-addendum','Supplier-reported. Product addendum, not a lot COA. Anniversary date printed: 2026-08-06. Current status not independently verified.');

--> statement-breakpoint
INSERT INTO proof_certifications VALUES ('non-gmo-2026','kasandrinos-team',NULL,'Non-GMO Project verification','Non-GMO Project','FoodChain ID',NULL,NULL,'KASELL SA for Kasandrinos Organic Extra Virgin Olive Oil','2026-03-02T00:00:00.000Z','2027-03-04T23:59:59.000Z','unknown','non-gmo-2026','Supplier-reported. Issued to KASELL SA for Kasandrinos Organic Extra Virgin Olive Oil. Printed expiry: 2027-03-04.');

--> statement-breakpoint
INSERT INTO proof_certifications VALUES ('kosher-2026','kasandrinos-team',NULL,'Kosher certificate','Kosher','Orthodox Union',NULL,NULL,'Extra Virgin Olive Oil','2026-02-04T00:00:00.000Z','2027-01-31T23:59:59.000Z','unknown','kosher-2026','Supplier-reported. Extra Virgin Olive Oil. Printed validity through 2027-01-31.');

--> statement-breakpoint
INSERT INTO proof_certifications VALUES ('paleo-keto-archive','kasandrinos-team',NULL,'Paleo and Keto certification letter','Paleo and Keto','Paleo Foundation','paleo','2021-2024 letter','Historical Paleo and Keto term','2021-01-25T00:00:00.000Z','2024-01-24T23:59:59.000Z','expired','paleo-keto-archive','Supplier-reported historical document. Printed term ended 2024-01-24; not presented as a current certification.');

--> statement-breakpoint
INSERT INTO proof_certifications VALUES ('organic-spices','kasandrinos-team',NULL,'Organic spices certificate and system plan','Organic spices','Oregon Tilth',NULL,NULL,'Ares Pepper and Zeus Blend only','2023-03-30T00:00:00.000Z',NULL,'unknown','organic-spices','Supplier-reported. Scope is Total Food Package / Kasandrinos Ares Pepper and Zeus Blend. Not evidence for olive oil.');
