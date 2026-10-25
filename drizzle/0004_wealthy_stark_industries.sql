CREATE TABLE `team_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`owner_email` text NOT NULL,
	`contact_email` text NOT NULL,
	`supplier_key` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_domains` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`domain` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`source` text DEFAULT 'invited' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_selections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`team_id` text
);
