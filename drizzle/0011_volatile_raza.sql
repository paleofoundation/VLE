CREATE TABLE `sourcing_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`account_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`task_key` text NOT NULL,
	`kind` text NOT NULL,
	`decision` text NOT NULL,
	`room_version` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `sourcing_rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sourcing_decisions_task_account` ON `sourcing_decisions` (`room_id`,`account_id`,`task_key`);