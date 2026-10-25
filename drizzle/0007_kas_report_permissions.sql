CREATE TABLE `kas_report_permission_events` (
	`report_number` text NOT NULL,
	`recipient_email` text NOT NULL,
	`revision` integer NOT NULL,
	`action` text NOT NULL,
	`results_access` integer NOT NULL,
	`pdf_access` integer NOT NULL,
	`expires_at` text,
	`actor_email` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`report_number`, `recipient_email`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `kas_report_permissions` (
	`report_number` text NOT NULL,
	`recipient_email` text NOT NULL,
	`status` text NOT NULL,
	`results_access` integer DEFAULT 0 NOT NULL,
	`pdf_access` integer DEFAULT 0 NOT NULL,
	`requested_results` integer DEFAULT 0 NOT NULL,
	`requested_pdf` integer DEFAULT 0 NOT NULL,
	`expires_at` text,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL,
	PRIMARY KEY(`report_number`, `recipient_email`)
);
