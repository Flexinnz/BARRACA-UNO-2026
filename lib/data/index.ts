// ============================================================================
// FASE 1.2.4 — SECURE DATA LAYER: TENANT-SCOPED DATA ACCESS
// ============================================================================
// Este módulo provee funciones estrictamente tenant-scoped para todas las
// entidades del SaaS.
//
// REGLAS ARQUITECTURALES:
// 1. Toda operación exige `scope: TenantScope` (TenantContext o tenantId) como 1er arg.
// 2. Toda lectura (SELECT) filtra por `tenant_id = ?` o `(id = ? AND tenant_id = ?)`.
// 3. Toda escritura (INSERT) inyecta `tenant_id` directamente del scope validado.
// 4. Toda mutación (UPDATE/DELETE) condiciona por `WHERE id = ? AND tenant_id = ?`.
// 5. Data Access ≠ Authorization: Este módulo garantiza AISLAMIENTO DE DATOS,
//    mientras que la verificación de permisos recae en la capa de autorización.
// ============================================================================

import {
  type TenantScope,
  type D1DatabaseLike,
  extractTenantId,
  getDefaultDb,
} from './scope';

export * from './scope';

// ============================================================================
// 1. TIPOS DE ENTIDADES TENANT-SCOPED
// ============================================================================

export interface ProductRecord {
  id: number;
  tenantId: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  tax: number;
  unit: string;
  imageId: string;
  imageSrc: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewProductInput {
  sku: string;
  name: string;
  category: string;
  price: number;
  tax?: number;
  unit?: string;
  imageId?: string;
  imageSrc?: string;
  description?: string;
}

export interface UpdateProductInput {
  sku?: string;
  name?: string;
  category?: string;
  price?: number;
  tax?: number;
  unit?: string;
  imageId?: string;
  imageSrc?: string;
  description?: string;
}

export interface ProductStockRecord {
  tenantId: string;
  productId: number;
  quantity: number;
  version: number;
  updatedAt: string;
}

export interface StockMovementRecord {
  id: string;
  tenantId: string;
  productId: number;
  type: string;
  amount: number;
  delta: number;
  beforeQuantity: number;
  afterQuantity: number;
  reason: string;
  reference: string;
  actorId: string;
  actorEmail: string;
  createdAt: string;
}

export interface NewStockMovementInput {
  id?: string;
  productId: number;
  type: string;
  amount: number;
  delta: number;
  beforeQuantity: number;
  afterQuantity: number;
  reason: string;
  reference?: string;
  actorId: string;
  actorEmail: string;
}

export interface OrderRecord {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: string;
  paymentMethod: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPhone: string;
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemRecord {
  id: number;
  orderId: string;
  productId: number;
  productName: string;
  productSku: string;
  productUnit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderWithItemsRecord extends OrderRecord {
  items: OrderItemRecord[];
}

export interface NewOrderInput {
  id?: string;
  userId: string;
  userEmail: string;
  userName?: string;
  status?: string;
  paymentMethod: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPhone: string;
  notes?: string;
  subtotal: number;
  tax: number;
  total: number;
}

export interface NewOrderItemInput {
  productId: number;
  productName: string;
  productSku: string;
  productUnit?: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
}

export interface TenantUserItemRecord {
  tenantId: string;
  userId: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 2. PRODUCTS REPOSITORY (Tenant-Scoped)
// ============================================================================

export const productsRepository = {
  /**
   * Obtiene todos los productos pertenecientes al tenant indicado.
   */
  async getProducts(
    scope: TenantScope,
    db?: D1DatabaseLike
  ): Promise<ProductRecord[]> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare(
        `SELECT id, tenant_id AS tenantId, sku, name, category, price, tax, unit,
                image_id AS imageId, image_src AS imageSrc, description,
                created_at AS createdAt, updated_at AS updatedAt
         FROM products
         WHERE tenant_id = ?
         ORDER BY id ASC`
      )
      .bind(tenantId)
      .all<ProductRecord>();

    return res.results ?? [];
  },

  /**
   * Obtiene un producto por ID dentro del scope estricto del tenant.
   */
  async getProductById(
    scope: TenantScope,
    id: number,
    db?: D1DatabaseLike
  ): Promise<ProductRecord | null> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare(
        `SELECT id, tenant_id AS tenantId, sku, name, category, price, tax, unit,
                image_id AS imageId, image_src AS imageSrc, description,
                created_at AS createdAt, updated_at AS updatedAt
         FROM products
         WHERE id = ? AND tenant_id = ?`
      )
      .bind(id, tenantId)
      .first<ProductRecord>();

    return res ?? null;
  },

  /**
   * Obtiene un producto por SKU dentro del scope estricto del tenant.
   */
  async getProductBySku(
    scope: TenantScope,
    sku: string,
    db?: D1DatabaseLike
  ): Promise<ProductRecord | null> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare(
        `SELECT id, tenant_id AS tenantId, sku, name, category, price, tax, unit,
                image_id AS imageId, image_src AS imageSrc, description,
                created_at AS createdAt, updated_at AS updatedAt
         FROM products
         WHERE sku = ? AND tenant_id = ?`
      )
      .bind(sku.trim(), tenantId)
      .first<ProductRecord>();

    return res ?? null;
  },

  /**
   * Crea un producto inyectando estrictamente el tenantId desde el scope.
   */
  async createProduct(
    scope: TenantScope,
    data: NewProductInput,
    db?: D1DatabaseLike
  ): Promise<ProductRecord> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const now = new Date().toISOString();

    await database
      .prepare(
        `INSERT INTO products (
           tenant_id, sku, name, category, price, tax, unit,
           image_id, image_src, description, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        tenantId,
        data.sku.trim(),
        data.name.trim(),
        data.category.trim(),
        data.price,
        data.tax ?? 22,
        data.unit ?? 'unidad',
        data.imageId ?? '',
        data.imageSrc ?? '',
        data.description ?? '',
        now,
        now
      )
      .run();

    const created = await this.getProductBySku(scope, data.sku, db);
    if (!created) {
      throw new Error(`Failed to retrieve created product with SKU ${data.sku}`);
    }
    return created;
  },

  /**
   * Actualiza un producto requiriendo siempre (id = ? AND tenant_id = ?).
   */
  async updateProduct(
    scope: TenantScope,
    id: number,
    data: UpdateProductInput,
    db?: D1DatabaseLike
  ): Promise<boolean> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const existing = await this.getProductById(scope, id, db);
    if (!existing) return false;

    const now = new Date().toISOString();
    const updatedSku = data.sku !== undefined ? data.sku.trim() : existing.sku;
    const updatedName = data.name !== undefined ? data.name.trim() : existing.name;
    const updatedCategory = data.category !== undefined ? data.category.trim() : existing.category;
    const updatedPrice = data.price !== undefined ? data.price : existing.price;
    const updatedTax = data.tax !== undefined ? data.tax : existing.tax;
    const updatedUnit = data.unit !== undefined ? data.unit : existing.unit;
    const updatedImageId = data.imageId !== undefined ? data.imageId : existing.imageId;
    const updatedImageSrc = data.imageSrc !== undefined ? data.imageSrc : existing.imageSrc;
    const updatedDescription = data.description !== undefined ? data.description : existing.description;

    const res = await database
      .prepare(
        `UPDATE products
         SET sku = ?, name = ?, category = ?, price = ?, tax = ?, unit = ?,
             image_id = ?, image_src = ?, description = ?, updated_at = ?
         WHERE id = ? AND tenant_id = ?`
      )
      .bind(
        updatedSku,
        updatedName,
        updatedCategory,
        updatedPrice,
        updatedTax,
        updatedUnit,
        updatedImageId,
        updatedImageSrc,
        updatedDescription,
        now,
        id,
        tenantId
      )
      .run();

    return (res.meta?.changes ?? 0) > 0;
  },

  /**
   * Elimina un producto garantizando aislamiento (id = ? AND tenant_id = ?).
   */
  async deleteProduct(
    scope: TenantScope,
    id: number,
    db?: D1DatabaseLike
  ): Promise<boolean> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare('DELETE FROM products WHERE id = ? AND tenant_id = ?')
      .bind(id, tenantId)
      .run();

    return (res.meta?.changes ?? 0) > 0;
  },
};

// ============================================================================
// 3. PRODUCT STOCK & MOVEMENTS REPOSITORY (Tenant-Scoped)
// ============================================================================

export const stockRepository = {
  /**
   * Obtiene el registro de stock de un producto dentro de un tenant.
   */
  async getProductStock(
    scope: TenantScope,
    productId: number,
    db?: D1DatabaseLike
  ): Promise<ProductStockRecord | null> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare(
        `SELECT tenant_id AS tenantId, product_id AS productId, quantity, version, updated_at AS updatedAt
         FROM product_stock
         WHERE product_id = ? AND tenant_id = ?`
      )
      .bind(productId, tenantId)
      .first<ProductStockRecord>();

    return res ?? null;
  },

  /**
   * Obtiene todo el stock de un tenant.
   */
  async getAllStock(
    scope: TenantScope,
    db?: D1DatabaseLike
  ): Promise<ProductStockRecord[]> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare(
        `SELECT tenant_id AS tenantId, product_id AS productId, quantity, version, updated_at AS updatedAt
         FROM product_stock
         WHERE tenant_id = ?`
      )
      .bind(tenantId)
      .all<ProductStockRecord>();

    return res.results ?? [];
  },

  /**
   * Establece o actualiza el stock de un producto para el tenant dado.
   */
  async setProductStock(
    scope: TenantScope,
    productId: number,
    quantity: number,
    db?: D1DatabaseLike
  ): Promise<void> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const now = new Date().toISOString();

    await database
      .prepare(
        `INSERT INTO product_stock (tenant_id, product_id, quantity, version, updated_at)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(tenant_id, product_id) DO UPDATE SET
           quantity = excluded.quantity,
           version = version + 1,
           updated_at = excluded.updated_at`
      )
      .bind(tenantId, productId, quantity, now)
      .run();
  },

  /**
   * Decrementa el stock de un producto con control de versión optimista y chequeo de cantidad.
   */
  async decrementProductStock(
    scope: TenantScope,
    productId: number,
    amount: number,
    currentVersion: number,
    db?: D1DatabaseLike
  ): Promise<boolean> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const now = new Date().toISOString();

    const res = await database
      .prepare(
        `UPDATE product_stock
         SET quantity = quantity - ?, version = version + 1, updated_at = ?
         WHERE product_id = ? AND tenant_id = ? AND version = ? AND quantity >= ?`
      )
      .bind(amount, now, productId, tenantId, currentVersion, amount)
      .run();

    return (res.meta?.changes ?? 0) > 0;
  },

  /**
   * Registra un movimiento de stock asociándolo estrictamente al tenantId del scope.
   */
  async recordStockMovement(
    scope: TenantScope,
    movement: NewStockMovementInput,
    db?: D1DatabaseLike
  ): Promise<string> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const now = new Date().toISOString();
    const movementId = movement.id ?? `sm_${crypto.randomUUID().replace(/-/g, '')}`;

    await database
      .prepare(
        `INSERT INTO stock_movements (
           id, tenant_id, product_id, type, amount, delta,
           before_quantity, after_quantity, reason, reference,
           actor_id, actor_email, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        movementId,
        tenantId,
        movement.productId,
        movement.type,
        movement.amount,
        movement.delta,
        movement.beforeQuantity,
        movement.afterQuantity,
        movement.reason,
        movement.reference ?? '',
        movement.actorId,
        movement.actorEmail,
        now
      )
      .run();

    return movementId;
  },

  /**
   * Obtiene el historial de movimientos de stock para el tenant.
   */
  async getStockMovements(
    scope: TenantScope,
    limit: number = 100,
    db?: D1DatabaseLike
  ): Promise<StockMovementRecord[]> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare(
        `SELECT id, tenant_id AS tenantId, product_id AS productId, type, amount, delta,
                before_quantity AS beforeQuantity, after_quantity AS afterQuantity,
                reason, reference, actor_id AS actorId, actor_email AS actorEmail,
                created_at AS createdAt
         FROM stock_movements
         WHERE tenant_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(tenantId, limit)
      .all<StockMovementRecord>();

    return res.results ?? [];
  },
};

// ============================================================================
// 4. ORDERS REPOSITORY (Tenant-Scoped)
// ============================================================================

export const ordersRepository = {
  /**
   * Obtiene pedidos de un tenant ordenados por fecha descendente.
   */
  async getOrders(
    scope: TenantScope,
    limit: number = 50,
    db?: D1DatabaseLike
  ): Promise<OrderRecord[]> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare(
        `SELECT id, tenant_id AS tenantId, user_id AS userId, user_email AS userEmail,
                user_name AS userName, status, payment_method AS paymentMethod,
                shipping_address AS shippingAddress, shipping_city AS shippingCity,
                shipping_phone AS shippingPhone, notes, subtotal, tax, total,
                created_at AS createdAt, updated_at AS updatedAt
         FROM orders
         WHERE tenant_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(tenantId, limit)
      .all<OrderRecord>();

    return res.results ?? [];
  },

  /**
   * Obtiene un pedido junto con sus ítems, comprobando que pertenezca al tenant.
   */
  async getOrderById(
    scope: TenantScope,
    orderId: string,
    db?: D1DatabaseLike
  ): Promise<OrderWithItemsRecord | null> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const order = await database
      .prepare(
        `SELECT id, tenant_id AS tenantId, user_id AS userId, user_email AS userEmail,
                user_name AS userName, status, payment_method AS paymentMethod,
                shipping_address AS shippingAddress, shipping_city AS shippingCity,
                shipping_phone AS shippingPhone, notes, subtotal, tax, total,
                created_at AS createdAt, updated_at AS updatedAt
         FROM orders
         WHERE id = ? AND tenant_id = ?`
      )
      .bind(orderId.trim(), tenantId)
      .first<OrderRecord>();

    if (!order) return null;

    const itemsRes = await database
      .prepare(
        `SELECT id, order_id AS orderId, product_id AS productId,
                product_name AS productName, product_sku AS productSku,
                product_unit AS productUnit, quantity, unit_price AS unitPrice,
                line_total AS lineTotal
         FROM order_items
         WHERE order_id = ?`
      )
      .bind(order.id)
      .all<OrderItemRecord>();

    return {
      ...order,
      items: itemsRes.results ?? [],
    };
  },

  /**
   * Crea un pedido y sus ítems asociándolos estrictamente al tenantId del scope.
   */
  async createOrder(
    scope: TenantScope,
    order: NewOrderInput,
    items: NewOrderItemInput[],
    db?: D1DatabaseLike
  ): Promise<string> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const now = new Date().toISOString();
    const orderId =
      order.id ??
      `OC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // 1. Insert order
    await database
      .prepare(
        `INSERT INTO orders (
           id, tenant_id, user_id, user_email, user_name, status,
           payment_method, shipping_address, shipping_city, shipping_phone,
           notes, subtotal, tax, total, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        orderId,
        tenantId,
        order.userId,
        order.userEmail,
        order.userName ?? '',
        order.status ?? 'pending',
        order.paymentMethod,
        order.shippingAddress,
        order.shippingCity,
        order.shippingPhone,
        order.notes ?? '',
        order.subtotal,
        order.tax,
        order.total,
        now,
        now
      )
      .run();

    // 2. Insert order items
    for (const item of items) {
      const lineTotal = item.lineTotal ?? item.quantity * item.unitPrice;
      await database
        .prepare(
          `INSERT INTO order_items (
             order_id, product_id, product_name, product_sku, product_unit,
             quantity, unit_price, line_total
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          orderId,
          item.productId,
          item.productName,
          item.productSku,
          item.productUnit ?? 'unidad',
          item.quantity,
          item.unitPrice,
          lineTotal
        )
        .run();
    }

    return orderId;
  },

  /**
   * Actualiza el estado de un pedido garantizando pertenencia al tenant.
   */
  async updateOrderStatus(
    scope: TenantScope,
    orderId: string,
    status: string,
    db?: D1DatabaseLike
  ): Promise<boolean> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const now = new Date().toISOString();

    const res = await database
      .prepare(
        `UPDATE orders
         SET status = ?, updated_at = ?
         WHERE id = ? AND tenant_id = ?`
      )
      .bind(status, now, orderId.trim(), tenantId)
      .run();

    return (res.meta?.changes ?? 0) > 0;
  },
};

// ============================================================================
// 5. TENANT SETTINGS & SECRETS REPOSITORY (Tenant-Scoped)
// ============================================================================

export const tenantSettingsRepository = {
  /**
   * Obtiene una configuración específica de tenant.
   */
  async getSetting(
    scope: TenantScope,
    key: string,
    db?: D1DatabaseLike
  ): Promise<string | null> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare('SELECT value FROM tenant_settings WHERE tenant_id = ? AND key = ?')
      .bind(tenantId, key.trim())
      .first<{ value: string | null }>();

    return res?.value ?? null;
  },

  /**
   * Obtiene todas las configuraciones de un tenant como mapa clave-valor.
   */
  async getAllSettings(
    scope: TenantScope,
    db?: D1DatabaseLike
  ): Promise<Record<string, string | null>> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare('SELECT key, value FROM tenant_settings WHERE tenant_id = ?')
      .bind(tenantId)
      .all<{ key: string; value: string | null }>();

    const out: Record<string, string | null> = {};
    for (const row of res.results ?? []) {
      out[row.key] = row.value;
    }
    return out;
  },

  /**
   * Guarda o actualiza una configuración scoped por tenant_id.
   */
  async setSetting(
    scope: TenantScope,
    key: string,
    value: string | null,
    db?: D1DatabaseLike
  ): Promise<void> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const now = new Date().toISOString();

    await database
      .prepare(
        `INSERT INTO tenant_settings (tenant_id, key, value, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`
      )
      .bind(tenantId, key.trim(), value, now, now)
      .run();
  },

  /**
   * Obtiene un secreto sensible garantizando aislamiento por tenant_id.
   */
  async getSecret(
    scope: TenantScope,
    key: string,
    db?: D1DatabaseLike
  ): Promise<string | null> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare('SELECT value FROM tenant_secrets WHERE tenant_id = ? AND key = ?')
      .bind(tenantId, key.trim())
      .first<{ value: string | null }>();

    return res?.value ?? null;
  },

  /**
   * Guarda o actualiza un secreto sensible scoped por tenant_id.
   */
  async setSecret(
    scope: TenantScope,
    key: string,
    value: string | null,
    db?: D1DatabaseLike
  ): Promise<void> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const now = new Date().toISOString();

    await database
      .prepare(
        `INSERT INTO tenant_secrets (tenant_id, key, value, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`
      )
      .bind(tenantId, key.trim(), value, now, now)
      .run();
  },
};

// ============================================================================
// 6. TENANT USERS REPOSITORY (Tenant-Scoped)
// ============================================================================

export const tenantUsersRepository = {
  /**
   * Obtiene los usuarios y roles asociados a un tenant.
   */
  async getTenantUsers(
    scope: TenantScope,
    db?: D1DatabaseLike
  ): Promise<TenantUserItemRecord[]> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare(
        `SELECT tenant_id AS tenantId, user_id AS userId, role, status,
                created_at AS createdAt, updated_at AS updatedAt
         FROM tenant_users
         WHERE tenant_id = ?`
      )
      .bind(tenantId)
      .all<TenantUserItemRecord>();

    return res.results ?? [];
  },

  /**
   * Obtiene la membresía específica de un usuario en un tenant (tenant_id + user_id).
   */
  async getTenantUser(
    scope: TenantScope,
    userId: string,
    db?: D1DatabaseLike
  ): Promise<TenantUserItemRecord | null> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare(
        `SELECT tenant_id AS tenantId, user_id AS userId, role, status,
                created_at AS createdAt, updated_at AS updatedAt
         FROM tenant_users
         WHERE tenant_id = ? AND user_id = ?`
      )
      .bind(tenantId, userId.trim())
      .first<TenantUserItemRecord>();

    return res ?? null;
  },

  /**
   * Agrega un nuevo miembro dentro del tenant inyectando tenantId del scope.
   */
  async addTenantUser(
    scope: TenantScope,
    userId: string,
    role: string,
    status = 'active',
    db?: D1DatabaseLike
  ): Promise<boolean> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const now = new Date().toISOString();

    const res = await database
      .prepare(
        `INSERT INTO tenant_users (tenant_id, user_id, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, user_id) DO UPDATE SET
           role = excluded.role,
           status = excluded.status,
           updated_at = excluded.updated_at`
      )
      .bind(tenantId, userId.trim(), role.trim(), status, now, now)
      .run();

    return (res.meta?.changes ?? 0) > 0;
  },

  /**
   * Actualiza el estado de un usuario dentro del tenant (WHERE tenant_id = ? AND user_id = ?).
   */
  async updateTenantUserStatus(
    scope: TenantScope,
    userId: string,
    status: string,
    db?: D1DatabaseLike
  ): Promise<boolean> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const now = new Date().toISOString();

    const res = await database
      .prepare(
        `UPDATE tenant_users
         SET status = ?, updated_at = ?
         WHERE tenant_id = ? AND user_id = ?`
      )
      .bind(status.trim(), now, tenantId, userId.trim())
      .run();

    return (res.meta?.changes ?? 0) > 0;
  },

  /**
   * Actualiza el rol de un usuario dentro del tenant (WHERE tenant_id = ? AND user_id = ?).
   */
  async updateTenantUserRole(
    scope: TenantScope,
    userId: string,
    role: string,
    db?: D1DatabaseLike
  ): Promise<boolean> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const now = new Date().toISOString();

    const res = await database
      .prepare(
        `UPDATE tenant_users
         SET role = ?, updated_at = ?
         WHERE tenant_id = ? AND user_id = ?`
      )
      .bind(role.trim(), now, tenantId, userId.trim())
      .run();

    return (res.meta?.changes ?? 0) > 0;
  },

  /**
   * Elimina la membresía de un usuario dentro del tenant (WHERE tenant_id = ? AND user_id = ?).
   */
  async removeTenantUser(
    scope: TenantScope,
    userId: string,
    db?: D1DatabaseLike
  ): Promise<boolean> {
    const tenantId = extractTenantId(scope);
    const database = db ?? (await getDefaultDb());
    const res = await database
      .prepare('DELETE FROM tenant_users WHERE tenant_id = ? AND user_id = ?')
      .bind(tenantId, userId.trim())
      .run();

    return (res.meta?.changes ?? 0) > 0;
  },
};
