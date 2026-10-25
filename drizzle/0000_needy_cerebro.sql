CREATE TABLE `evidence_views` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`company` text NOT NULL,
	`lot` text NOT NULL,
	`supplier` text NOT NULL,
	`viewed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_sessions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
