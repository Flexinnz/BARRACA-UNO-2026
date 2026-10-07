DROP TABLE products;
CREATE TABLE products (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  sku text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  price integer NOT NULL,
  tax integer DEFAULT 22 NOT NULL,
  unit text DEFAULT 'unidad' NOT NULL,
  image_id text DEFAULT '' NOT NULL,
  image_src text DEFAULT '' NOT NULL,
  description text DEFAULT '' NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
CREATE UNIQUE INDEX products_sku_unique ON products (sku);
