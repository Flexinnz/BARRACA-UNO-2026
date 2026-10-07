-- ==========================================================================
-- SCRIPT DE VALIDACIÓN DE INTEGRIDAD POST-MIGRACIÓN (FASE 1.1)
-- ==========================================================================
-- Este script es estrictamente de LECTURA (READ-ONLY).
-- No inserta, modifica ni elimina datos.
-- Diseñado para Cloudflare D1 / SQLite.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- CHECK A & B: Registros tenant-owned no deben tener tenant_id NULL
-- (Todas las violations deben ser 0)
-- --------------------------------------------------------------------------
SELECT 'CHECK B: NULL TENANT_ID IN PRODUCTS' AS check_name, count(*) AS violations FROM products WHERE tenant_id IS NULL;
SELECT 'CHECK B: NULL TENANT_ID IN PRODUCT_STOCK' AS check_name, count(*) AS violations FROM product_stock WHERE tenant_id IS NULL;
SELECT 'CHECK B: NULL TENANT_ID IN STOCK_MOVEMENTS' AS check_name, count(*) AS violations FROM stock_movements WHERE tenant_id IS NULL;
SELECT 'CHECK B: NULL TENANT_ID IN ORDERS' AS check_name, count(*) AS violations FROM orders WHERE tenant_id IS NULL;

-- --------------------------------------------------------------------------
-- CHECK C: Todos los tenant_id deben apuntar a un registro válido en `tenants`
-- (Todas las violations deben ser 0)
-- --------------------------------------------------------------------------
SELECT 'CHECK C: ORPHAN PRODUCTS' AS check_name, count(*) AS violations 
FROM products p LEFT JOIN tenants t ON p.tenant_id = t.id WHERE t.id IS NULL;

SELECT 'CHECK C: ORPHAN PRODUCT_STOCK' AS check_name, count(*) AS violations 
FROM product_stock ps LEFT JOIN tenants t ON ps.tenant_id = t.id WHERE t.id IS NULL;

SELECT 'CHECK C: ORPHAN STOCK_MOVEMENTS' AS check_name, count(*) AS violations 
FROM stock_movements sm LEFT JOIN tenants t ON sm.tenant_id = t.id WHERE t.id IS NULL;

SELECT 'CHECK C: ORPHAN ORDERS' AS check_name, count(*) AS violations 
FROM orders o LEFT JOIN tenants t ON o.tenant_id = t.id WHERE t.id IS NULL;

SELECT 'CHECK C: ORPHAN TENANT_USERS' AS check_name, count(*) AS violations 
FROM tenant_users tu LEFT JOIN tenants t ON tu.tenant_id = t.id WHERE t.id IS NULL;

-- --------------------------------------------------------------------------
-- CHECK D & E: Unicidad de SKU por tenant (NO global)
-- --------------------------------------------------------------------------
-- Antiguo índice global UNIQUE(sku) debe haber desaparecido (debe ser 0)
SELECT 'CHECK D: OBSOLETE GLOBAL SKU UNIQUE INDEX (MUST BE 0)' AS check_name, count(*) AS count 
FROM sqlite_master WHERE type = 'index' AND name = 'products_sku_unique';

-- Nuevo índice compuesto UNIQUE(tenant_id, sku) debe existir (debe ser 1)
SELECT 'CHECK D: COMPOUND UNIQUE INDEX (TENANT_ID, SKU) (MUST BE 1)' AS check_name, count(*) AS count 
FROM sqlite_master WHERE type = 'index' AND name = 'products_tenant_sku_unique';

-- No deben existir duplicados del mismo SKU dentro del mismo tenant (debe ser 0)
SELECT 'CHECK E: DUPLICATE SKU IN SAME TENANT (MUST BE 0)' AS check_name, count(*) AS violations 
FROM (
  SELECT tenant_id, sku, count(*) AS cnt 
  FROM products 
  GROUP BY tenant_id, sku 
  HAVING count(*) > 1
);

-- --------------------------------------------------------------------------
-- CHECK F: Relación tenant/product en product_stock y clave compuesta
-- --------------------------------------------------------------------------
-- Ningún registro de product_stock debe estar huérfano respecto a products del mismo tenant
SELECT 'CHECK F: PRODUCT_STOCK ORPHANS (MUST BE 0)' AS check_name, count(*) AS violations 
FROM product_stock ps 
LEFT JOIN products p ON ps.tenant_id = p.tenant_id AND ps.product_id = p.id 
WHERE p.id IS NULL;

-- Clave primaria compuesta (tenant_id, product_id) sin duplicados
SELECT 'CHECK F: DUPLICATE (TENANT_ID, PRODUCT_ID) IN STOCK (MUST BE 0)' AS check_name, count(*) AS violations 
FROM (
  SELECT tenant_id, product_id, count(*) AS cnt 
  FROM product_stock 
  GROUP BY tenant_id, product_id 
  HAVING count(*) > 1
);

-- --------------------------------------------------------------------------
-- CHECK G & H: orders y stock_movements tienen tenant_id válido
-- --------------------------------------------------------------------------
SELECT 'CHECK G: ORDERS WITH INVALID TENANT (MUST BE 0)' AS check_name, count(*) AS violations 
FROM orders WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tenants);

SELECT 'CHECK H: STOCK_MOVEMENTS WITH INVALID TENANT (MUST BE 0)' AS check_name, count(*) AS violations 
FROM stock_movements WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tenants);

-- --------------------------------------------------------------------------
-- CHECK I: order_items siguen vinculados a órdenes existentes
-- --------------------------------------------------------------------------
SELECT 'CHECK I: ORPHAN ORDER_ITEMS (MUST BE 0)' AS check_name, count(*) AS violations 
FROM order_items oi LEFT JOIN orders o ON oi.order_id = o.id WHERE o.id IS NULL;

-- --------------------------------------------------------------------------
-- CHECK J: email_logs existe y admite tenant_id NULL
-- --------------------------------------------------------------------------
SELECT 'CHECK J: EMAIL_LOGS TABLE EXISTS (MUST BE 1)' AS check_name, count(*) AS count 
FROM sqlite_master WHERE type = 'table' AND name = 'email_logs';

SELECT 'CHECK J: EMAIL_LOGS WITH NULL TENANT_ID (ALLOWED)' AS check_name, count(*) AS count 
FROM email_logs WHERE tenant_id IS NULL;

-- --------------------------------------------------------------------------
-- CHECK K: Comparación de conteos pre vs post migración
-- --------------------------------------------------------------------------
SELECT 'CHECK K: TOTAL TENANTS' AS check_name, count(*) AS count FROM tenants;
SELECT 'CHECK K: TOTAL TENANT_USERS' AS check_name, count(*) AS count FROM tenant_users;
SELECT 'CHECK K: TOTAL PRODUCTS' AS check_name, count(*) AS count FROM products;
SELECT 'CHECK K: TOTAL PRODUCT_STOCK' AS check_name, count(*) AS count FROM product_stock;
SELECT 'CHECK K: TOTAL STOCK_MOVEMENTS' AS check_name, count(*) AS count FROM stock_movements;
SELECT 'CHECK K: TOTAL ORDERS' AS check_name, count(*) AS count FROM orders;
SELECT 'CHECK K: TOTAL ORDER_ITEMS' AS check_name, count(*) AS count FROM order_items;
SELECT 'CHECK K: TOTAL ACCOUNTS (GLOBAL, UNTOUCHED)' AS check_name, count(*) AS count FROM accounts;
SELECT 'CHECK K: TOTAL EMAIL_LOGS' AS check_name, count(*) AS count FROM email_logs;

-- --------------------------------------------------------------------------
-- CHECK L: Preservación de IDs
-- --------------------------------------------------------------------------
SELECT 'CHECK L: PRODUCTS ID RANGE' AS check_name, printf('min=%d, max=%d, total=%d', min(id), max(id), count(id)) AS details FROM products;
SELECT 'CHECK L: PRODUCT_STOCK PRODUCT_ID RANGE' AS check_name, printf('min=%d, max=%d, total=%d', min(product_id), max(product_id), count(product_id)) AS details FROM product_stock;
SELECT 'CHECK L: ORDERS DISTINCT IDS' AS check_name, printf('total=%d, distinct=%d', count(*), count(DISTINCT id)) AS details FROM orders;

-- --------------------------------------------------------------------------
-- VERIFICACIÓN TENANT BOOTSTRAP BARRACA UNO
-- --------------------------------------------------------------------------
SELECT 'LEGACY: BARRACA-UNO TENANT EXISTS' AS check_name, count(*) AS count FROM tenants WHERE slug = 'barraca-uno';
SELECT 'LEGACY: BARRACA-UNO OWNERS' AS check_name, count(*) AS count FROM tenant_users tu JOIN tenants t ON tu.tenant_id = t.id WHERE t.slug = 'barraca-uno' AND tu.role = 'owner';
