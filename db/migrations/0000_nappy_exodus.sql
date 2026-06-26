CREATE TABLE `acts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`payment_id` integer NOT NULL,
	`is_sent` integer DEFAULT false NOT NULL,
	`sent_at` integer,
	`is_signed` integer DEFAULT false NOT NULL,
	`signed_at` integer,
	`manager_comment` text DEFAULT '' NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `acts_payment_id_unique` ON `acts` (`payment_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`legal_type` text NOT NULL,
	`inn` text NOT NULL,
	`ogrn` text,
	`bank_account` text,
	`bank` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_inn_unique` ON `clients` (`inn`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`client_id` integer NOT NULL,
	`payment_date` text NOT NULL,
	`amount` real NOT NULL,
	`payment_purpose` text NOT NULL,
	`service_stage` text NOT NULL,
	`invoice` text,
	`doc` text,
	`contract` text,
	`account` text,
	`source` text DEFAULT 'seed' NOT NULL,
	`natural_key` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_natural_key_unique` ON `payments` (`natural_key`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`client_id` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
