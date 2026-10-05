ALTER TABLE `accounts` ADD `auth_version` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
DROP TABLE IF EXISTS `user_sessions`;
