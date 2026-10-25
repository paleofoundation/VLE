CREATE TABLE `kas_access_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`dedupe_key` text NOT NULL,
	`kind` text NOT NULL,
	`report_number` text,
	`requester_email` text,
	`request_revision` integer,
	`requested_results` integer NOT NULL,
	`requested_pdf` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt` integer DEFAULT 0 NOT NULL,
	`lease_id` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`sent_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kas_access_notifications_dedupe_key_unique` ON `kas_access_notifications` (`dedupe_key`);
--> statement-breakpoint
-- One explicitly TEST setup check; creates no report request or grant.
INSERT OR IGNORE INTO kas_access_notifications (id,dedupe_key,kind,requested_results,requested_pdf,created_at)
VALUES ('f5b414b8-a785-4b1e-b837-e2fa8a964570','installation-check:kas-access-notifications-v1','delivery_test',0,0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
