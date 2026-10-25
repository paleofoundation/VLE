CREATE TABLE `supplier_storefronts` (
	`supplier` text PRIMARY KEY NOT NULL,
	`draft` text NOT NULL,
	`published` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`manager_email` text,
	`updated_at` text NOT NULL
);
