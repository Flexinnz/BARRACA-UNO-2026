-- ==========================================================================
-- Migration 0010: Multi-Tenant Foundation
-- ==========================================================================
-- D1 wraps each migration file in an implicit transaction. Do NOT add
-- BEGIN/COMMIT manually — "cannot start a transaction within a transaction".
--
-- PRAGMA defer_foreign_keys = on defers FK constraint checks until the
-- implicit transaction commits. Required for the table-recreation pattern
-- where we DROP a parent table before rebuilding child references.
-- Unlike PRAGMA foreign_keys=OFF (unsupported by D1), this keeps FK
-- enforcement active but allows temporary violations mid-migration.
-- ==========================================================================

PRAGMA defer_foreign_keys = on;

-- ==============================
-- 1. Tenant Foundation Tables
-- ==============================

CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);

CREATE TABLE `tenant_users` (
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'employee' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`tenant_id`, `user_id`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`user_id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `idx_tenant_users_user` ON `tenant_users` (`user_id`);

CREATE TABLE `tenant_settings` (
	`tenant_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`tenant_id`, `key`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `tenant_secrets` (
	`tenant_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`tenant_id`, `key`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `platform_users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'platform_owner' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`user_id`) ON UPDATE no action ON DELETE cascade
);

-- ==============================
-- 2. Bootstrap Tenant: Barraca UNO
-- ==============================
-- 'tnt_barraca' is used strictly as a migration bootstrap ID for seeding
-- the initial tenant and associating legacy data. Application runtime
-- code never hardcodes this ID, resolving the tenant dynamically via slug lookup.

INSERT INTO `tenants` (`id`, `slug`, `name`, `status`, `created_at`, `updated_at`)
VALUES ('tnt_barraca', 'barraca-uno', 'Barraca UNO', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Associate tenant owners
INSERT INTO `tenant_users` (`tenant_id`, `user_id`, `role`, `status`, `created_at`, `updated_at`)
SELECT 'tnt_barraca', `user_id`, 'owner', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `accounts`
WHERE lower(`email`) IN ('caordamian@gmail.com', 'brunosaravia09@gmail.com', 'integemini@gmail.com');

-- Bootstrap platform owners
INSERT OR IGNORE INTO `platform_users` (`user_id`, `role`, `status`, `created_at`, `updated_at`)
SELECT `user_id`, 'platform_owner', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `accounts`
WHERE lower(`email`) IN ('caordamian@gmail.com', 'brunosaravia09@gmail.com');

-- ==============================
-- 3. Recreate PRODUCTS
-- ==============================
-- Adds tenant_id NOT NULL with FK to tenants.
-- Changes SKU uniqueness from global UNIQUE(sku) to per-tenant UNIQUE(tenant_id, sku).
-- Preserves all existing columns, defaults, types, and primary key.

CREATE TABLE `new_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`tax` integer DEFAULT 22 NOT NULL,
	`unit` text DEFAULT 'unidad' NOT NULL,
	`image_id` text DEFAULT '' NOT NULL,
	`image_src` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE restrict
);
INSERT INTO `new_products` (`id`, `tenant_id`, `sku`, `name`, `category`, `price`, `tax`, `unit`, `image_id`, `image_src`, `description`, `created_at`, `updated_at`)
SELECT `id`, 'tnt_barraca', `sku`, `name`, `category`, `price`, `tax`, `unit`, `image_id`, `image_src`, `description`, `created_at`, `updated_at` FROM `products`;
DROP TABLE `products`;
ALTER TABLE `new_products` RENAME TO `products`;
CREATE UNIQUE INDEX `products_tenant_sku_unique` ON `products` (`tenant_id`, `sku`);
CREATE INDEX `idx_products_tenant` ON `products` (`tenant_id`);

-- ==============================
-- 4. Recreate PRODUCT_STOCK
-- ==============================
-- Adds tenant_id NOT NULL with FK to tenants.
-- Changes primary key from (product_id) to composite (tenant_id, product_id)
-- so different tenants can maintain independent stocks without colliding on product_id.

CREATE TABLE `new_product_stock` (
	`tenant_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`tenant_id`, `product_id`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO `new_product_stock` (`tenant_id`, `product_id`, `quantity`, `version`, `updated_at`)
SELECT 'tnt_barraca', `product_id`, `quantity`, `version`, `updated_at` FROM `product_stock`;
DROP TABLE `product_stock`;
ALTER TABLE `new_product_stock` RENAME TO `product_stock`;

-- ==============================
-- 5. Recreate STOCK_MOVEMENTS
-- ==============================
-- Adds tenant_id NOT NULL with FK to tenants.
-- Preserves all existing columns, defaults, types, and primary key.

CREATE TABLE `new_stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`delta` integer NOT NULL,
	`before_quantity` integer NOT NULL,
	`after_quantity` integer NOT NULL,
	`reason` text NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`actor_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO `new_stock_movements` (`id`, `tenant_id`, `product_id`, `type`, `amount`, `delta`, `before_quantity`, `after_quantity`, `reason`, `reference`, `actor_id`, `actor_email`, `created_at`)
SELECT `id`, 'tnt_barraca', `product_id`, `type`, `amount`, `delta`, `before_quantity`, `after_quantity`, `reason`, `reference`, `actor_id`, `actor_email`, `created_at` FROM `stock_movements`;
DROP TABLE `stock_movements`;
ALTER TABLE `new_stock_movements` RENAME TO `stock_movements`;
CREATE INDEX `idx_stock_movements_tenant` ON `stock_movements` (`tenant_id`);

-- ==============================
-- 6. Recreate ORDERS
-- ==============================
-- Adds tenant_id NOT NULL with FK to tenants.
-- Preserves all existing columns, defaults, types, and primary key.

CREATE TABLE `new_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`user_email` text NOT NULL,
	`user_name` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_method` text DEFAULT '' NOT NULL,
	`shipping_address` text DEFAULT '' NOT NULL,
	`shipping_city` text DEFAULT '' NOT NULL,
	`shipping_phone` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`tax` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE restrict
);
INSERT INTO `new_orders` (`id`, `tenant_id`, `user_id`, `user_email`, `user_name`, `status`, `payment_method`, `shipping_address`, `shipping_city`, `shipping_phone`, `notes`, `subtotal`, `tax`, `total`, `created_at`, `updated_at`)
SELECT `id`, 'tnt_barraca', `user_id`, `user_email`, `user_name`, `status`, `payment_method`, `shipping_address`, `shipping_city`, `shipping_phone`, `notes`, `subtotal`, `tax`, `total`, `created_at`, `updated_at` FROM `orders`;
DROP TABLE `orders`;
ALTER TABLE `new_orders` RENAME TO `orders`;
CREATE INDEX `idx_orders_tenant` ON `orders` (`tenant_id`);

-- ==============================
-- 7. EMAIL_LOGS — add tenant_id (NULLABLE)
-- ==============================
-- email_logs was previously created ad-hoc via lib/email.ts (CREATE TABLE IF NOT EXISTS).
-- It was never in migrations 0000-0009. In fresh test/dev environments, it may not exist yet.
-- To ensure deterministic migration without "no such table: email_logs", we first guarantee
-- its existence via CREATE TABLE IF NOT EXISTS.
-- Then we rebuild it with nullable tenant_id and preserve any existing rows.

CREATE TABLE IF NOT EXISTS `email_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`recipient` text,
	`subject` text,
	`status` text,
	`resend_id` text,
	`error_message` text,
	`created_at` text
);

CREATE TABLE `new_email_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` text,
	`recipient` text,
	`subject` text,
	`status` text,
	`resend_id` text,
	`error_message` text,
	`created_at` text
);

INSERT INTO `new_email_logs` (`id`, `tenant_id`, `recipient`, `subject`, `status`, `resend_id`, `error_message`, `created_at`)
SELECT `id`, NULL, `recipient`, `subject`, `status`, `resend_id`, `error_message`, `created_at`
FROM `email_logs`;

DROP TABLE `email_logs`;
ALTER TABLE `new_email_logs` RENAME TO `email_logs`;
CREATE INDEX `idx_email_logs_tenant` ON `email_logs` (`tenant_id`);
