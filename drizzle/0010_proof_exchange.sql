CREATE TABLE `lot_releases` (
	`id` text PRIMARY KEY NOT NULL,
	`lot_id` text NOT NULL,
	`brand_id` text NOT NULL,
	`label` text NOT NULL,
	`asserted_by` text NOT NULL,
	`asserted_at` text NOT NULL,
	`confirmed_by` text,
	`confirmed_at` text,
	`withdrawn_at` text,
	FOREIGN KEY (`lot_id`) REFERENCES `proof_lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`brand_id`) REFERENCES `proof_organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lot_releases_lot_brand_label` ON `lot_releases` (`lot_id`,`brand_id`,`label`);--> statement-breakpoint
CREATE TABLE `lot_tecrids` (
	`tecrid` text PRIMARY KEY NOT NULL,
	`lot_id` text NOT NULL,
	`version` integer NOT NULL,
	`sequence` integer NOT NULL,
	`status` text NOT NULL,
	`program` text NOT NULL,
	`issuing_lab` text NOT NULL,
	`issued_at` text NOT NULL,
	`retest_due` text,
	`verification_url` text NOT NULL,
	`fingerprint` text NOT NULL,
	`grant_id` text NOT NULL,
	`grant_status` text NOT NULL,
	`access_level` text NOT NULL,
	`public_status` integer DEFAULT 0 NOT NULL,
	`grant_expires_at` text,
	`brand_ids` text NOT NULL,
	`received_at` text NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `proof_lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organization_roles` (
	`organization_id` text NOT NULL,
	`role` text NOT NULL,
	PRIMARY KEY(`organization_id`, `role`),
	FOREIGN KEY (`organization_id`) REFERENCES `proof_organizations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "organization_roles_role_check" CHECK("organization_roles"."role" IN ('supplier','brand','private_label_manufacturer','retailer','certification_body'))
);
--> statement-breakpoint
CREATE TABLE `proof_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`action` text NOT NULL,
	`subject_id` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proof_certifications` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`lot_id` text,
	`title` text NOT NULL,
	`program` text NOT NULL,
	`issuer` text NOT NULL,
	`registry` text,
	`registry_id` text,
	`scope` text NOT NULL,
	`issued_at` text,
	`expires_at` text,
	`reported_status` text DEFAULT 'unknown' NOT NULL,
	`source_report_id` text,
	`note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `proof_organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `proof_lots`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "proof_certifications_registry_check" CHECK("proof_certifications"."registry" IN ('paleo','ics'))
);
--> statement-breakpoint
CREATE TABLE `proof_delivery_receipts` (
	`delivery_id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`body_hash` text NOT NULL,
	`lot_id` text NOT NULL,
	`tecrid` text NOT NULL,
	`sequence` integer NOT NULL,
	`received_at` text NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `proof_lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proof_delivery_receipts_event_id_unique` ON `proof_delivery_receipts` (`event_id`);--> statement-breakpoint
CREATE TABLE `proof_lots` (
	`id` text PRIMARY KEY NOT NULL,
	`supplier_id` text NOT NULL,
	`supplier_lot_id` text NOT NULL,
	`ingredient_code` text,
	`product_sku` text,
	`product` text NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `proof_organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proof_lots_supplier_lot` ON `proof_lots` (`supplier_id`,`supplier_lot_id`);--> statement-breakpoint
CREATE INDEX `proof_lots_ingredient` ON `proof_lots` (`supplier_id`,`ingredient_code`);--> statement-breakpoint
CREATE TABLE `proof_organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proof_organizations_team_id_unique` ON `proof_organizations` (`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `proof_organizations_slug_unique` ON `proof_organizations` (`slug`);
--> statement-breakpoint
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
