CREATE TABLE `sourcing_briefs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`shared` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Open' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sourcing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sourcing_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`message` text NOT NULL,
	`href` text NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	`delivery` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sourcing_preferences` (
	`email` text PRIMARY KEY NOT NULL,
	`email_enabled` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sourcing_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_id` text NOT NULL,
	`supplier_email` text NOT NULL,
	`supplier_name` text NOT NULL,
	`lot` text NOT NULL,
	`brief` text NOT NULL,
	`stage` text DEFAULT 'Inquiry' NOT NULL,
	`record` text DEFAULT '{}' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `supplier_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`body` text NOT NULL,
	`file_key` text NOT NULL,
	`status` text DEFAULT 'Submitted' NOT NULL,
	`review` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
