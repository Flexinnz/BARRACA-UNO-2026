CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`avatar` text DEFAULT 'initials' NOT NULL,
	`accent` text DEFAULT 'ocean' NOT NULL,
	`theme` text DEFAULT 'dark' NOT NULL,
	`density` text DEFAULT 'comfortable' NOT NULL,
	`updated_at` text NOT NULL
);
