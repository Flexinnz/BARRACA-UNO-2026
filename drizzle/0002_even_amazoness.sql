CREATE TABLE `product_stock` (
	`product_id` integer PRIMARY KEY NOT NULL,
	`quantity` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
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
	`created_at` text NOT NULL
);

--> statement-breakpoint
INSERT INTO product_stock (product_id,quantity,version,updated_at) VALUES (1,240,0,'2026-10-04T12:18:40.403Z'),(2,85,0,'2026-10-04T12:18:40.403Z'),(3,8,0,'2026-10-04T12:18:40.403Z'),(4,120,0,'2026-10-04T12:18:40.403Z'),(5,0,0,'2026-10-04T12:18:40.403Z'),(6,18,0,'2026-10-04T12:18:40.403Z'),(7,42,0,'2026-10-04T12:18:40.403Z'),(8,6,0,'2026-10-04T12:18:40.403Z'),(9,3200,0,'2026-10-04T12:18:40.403Z'),(10,64,0,'2026-10-04T12:18:40.403Z'),(11,9,0,'2026-10-04T12:18:40.403Z'),(12,32,0,'2026-10-04T12:18:40.403Z');
