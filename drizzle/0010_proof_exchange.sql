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
