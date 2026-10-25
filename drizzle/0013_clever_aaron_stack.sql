CREATE TABLE `phone_document_records` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`owner_account_id` text NOT NULL,
	`kind` text NOT NULL,
	`ingredient_code` text NOT NULL,
	`payload_json` text NOT NULL,
	`source_file_key` text NOT NULL,
	`source_hash` text NOT NULL,
	`record_fingerprint` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`reviewed_by` text NOT NULL,
	`review_reference` text NOT NULL,
	`reviewed_at` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `supplier_submissions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_account_id`) REFERENCES `team_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phone_document_submission_kind` ON `phone_document_records` (`submission_id`,`kind`);--> statement-breakpoint
CREATE TABLE `phone_request_recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`supplier_account_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reply` text,
	`asset_refs_json` text DEFAULT '[]' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`answered_by` text,
	`answered_at` text,
	`last_mutation_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `phone_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_account_id`) REFERENCES `team_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phone_request_supplier` ON `phone_request_recipients` (`request_id`,`supplier_account_id`);--> statement-breakpoint
CREATE TABLE `phone_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_account_id` text NOT NULL,
	`ingredient_code` text NOT NULL,
	`ingredient_label` text NOT NULL,
	`items_json` text NOT NULL,
	`target_mode` text NOT NULL,
	`selected_ids_json` text NOT NULL,
	`body_hash` text NOT NULL,
	`fanout_done` integer DEFAULT 0 NOT NULL,
	`target_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`answer_revision` integer DEFAULT 0 NOT NULL,
	`seen_answer_revision` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`buyer_account_id`) REFERENCES `team_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `phone_supplier_catalog` (
	`account_id` text NOT NULL,
	`ingredient_code` text NOT NULL,
	`ingredient_label` text NOT NULL,
	`status` text NOT NULL,
	`reviewed_by` text NOT NULL,
	`review_reference` text NOT NULL,
	`reviewed_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`account_id`, `ingredient_code`),
	FOREIGN KEY (`account_id`) REFERENCES `team_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
