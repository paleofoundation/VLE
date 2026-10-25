CREATE TABLE `lot_tecrid_grants` (
	`tecrid` text NOT NULL,
	`grant_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`controller_id` text NOT NULL,
	`stream_id` text NOT NULL,
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
	`grant_status` text NOT NULL,
	`access_level` text NOT NULL,
	`public_status` integer DEFAULT 0 NOT NULL,
	`grant_expires_at` text,
	`brand_ids` text NOT NULL,
	`supersedes_grant_id` text,
	`snapshot_json` text,
	`snapshot_fingerprint` text,
	`received_at` text NOT NULL,
	PRIMARY KEY(`tecrid`, `recipient_id`, `grant_id`),
	FOREIGN KEY (`stream_id`) REFERENCES `proof_stream_state`(`stream_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `proof_lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `proof_stream_state` (
	`stream_id` text PRIMARY KEY NOT NULL,
	`recipient_id` text NOT NULL,
	`tecrid` text NOT NULL,
	`lot_id` text NOT NULL,
	`originating_supplier` text NOT NULL,
	`mapping_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`credential_version` integer NOT NULL,
	`credential_fingerprint` text NOT NULL,
	`credential_status` text NOT NULL,
	`event_id` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `proof_lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proof_stream_recipient_credential` ON `proof_stream_state` (`recipient_id`,`tecrid`);--> statement-breakpoint
ALTER TABLE `proof_delivery_receipts` ADD `stream_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `proof_receipt_stream_sequence` ON `proof_delivery_receipts` (`stream_id`,`sequence`);