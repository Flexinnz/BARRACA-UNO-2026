import { sqliteTable, text, integer, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// GLOBAL PLATFORM TABLES
// ============================================================================

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  company: text('company').notNull().default(''),
  phone: text('phone').notNull().default(''),
  bio: text('bio').notNull().default(''),
  avatar: text('avatar').notNull().default('initials'),
  accent: text('accent').notNull().default('ocean'),
  theme: text('theme').notNull().default('dark'),
  density: text('density').notNull().default('comfortable'),
  updatedAt: text('updated_at').notNull(),
});

export const accounts = sqliteTable('accounts', {
  userId: text('user_id').primaryKey(),
  email: text('email').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  authVersion: integer('auth_version').notNull().default(0),
});

export const accountEvents = sqliteTable('account_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actorId: text('actor_id').notNull(),
  targetId: text('target_id').notNull(),
  targetEmail: text('target_email').notNull(),
  action: text('action').notNull(),
  createdAt: text('created_at').notNull(),
});

export const accountIdentities = sqliteTable('account_identities', {
  providerUserId: text('provider_user_id').primaryKey(),
  accountUserId: text('account_user_id').notNull(),
});

export const userCredentials = sqliteTable('user_credentials', {
  userId: text('user_id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  createdAt: text('created_at').notNull(),
});

export const platformUsers = sqliteTable('platform_users', {
  userId: text('user_id').primaryKey().references(() => accounts.userId, { onDelete: 'cascade' }),
  role: text('role').notNull().default('platform_owner'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});


// ============================================================================
// MULTI-TENANT FOUNDATION
// ============================================================================

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(), // tnt_...
  slug: text('slug').notNull().unique(), // e.g. barraca-uno
  name: text('name').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tenantUsers = sqliteTable('tenant_users', {
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => accounts.userId, { onDelete: 'cascade' }),
  role: text('role').notNull().default('employee'), // 'owner', 'admin', 'manager', 'employee', 'viewer'
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.userId] }),
  userIdx: index('idx_tenant_users_user').on(table.userId),
}));

export const tenantSettings = sqliteTable('tenant_settings', {
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.key] }),
}));

export const tenantSecrets = sqliteTable('tenant_secrets', {
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.key] }),
}));


// ============================================================================
// TENANT-SCOPED BUSINESS DATA
// ============================================================================

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  price: integer('price').notNull(),
  tax: integer('tax').notNull().default(22),
  unit: text('unit').notNull().default('unidad'),
  imageId: text('image_id').notNull().default(''),
  imageSrc: text('image_src').notNull().default(''),
  description: text('description').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  tenantSkuIdx: uniqueIndex('products_tenant_sku_unique').on(table.tenantId, table.sku),
  tenantIdx: index('idx_products_tenant').on(table.tenantId),
}));

export const productStock = sqliteTable('product_stock', {
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  version: integer('version').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.productId] }),
}));

export const stockMovements = sqliteTable('stock_movements', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull(),
  type: text('type').notNull(),
  amount: integer('amount').notNull(),
  delta: integer('delta').notNull(),
  before: integer('before_quantity').notNull(),
  after: integer('after_quantity').notNull(),
  reason: text('reason').notNull(),
  reference: text('reference').notNull().default(''),
  actorId: text('actor_id').notNull(),
  actorEmail: text('actor_email').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  tenantIdx: index('idx_stock_movements_tenant').on(table.tenantId),
}));

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  userName: text('user_name').notNull().default(''),
  status: text('status').notNull().default('pending'),
  paymentMethod: text('payment_method').notNull().default(''),
  shippingAddress: text('shipping_address').notNull().default(''),
  shippingCity: text('shipping_city').notNull().default(''),
  shippingPhone: text('shipping_phone').notNull().default(''),
  notes: text('notes').notNull().default(''),
  subtotal: integer('subtotal').notNull().default(0),
  tax: integer('tax').notNull().default(0),
  total: integer('total').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  tenantIdx: index('idx_orders_tenant').on(table.tenantId),
}));

// No tenant_id: logically grouped inside an order, bounded by order's tenantId
export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: text('order_id').notNull(),
  productId: integer('product_id').notNull(),
  productName: text('product_name').notNull(),
  productSku: text('product_sku').notNull(),
  productUnit: text('product_unit').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  lineTotal: integer('line_total').notNull(),
});


// ============================================================================
// RELATIONS
// ============================================================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(tenantUsers),
  products: many(products),
  orders: many(orders),
}));

export const tenantUsersRelations = relations(tenantUsers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantUsers.tenantId],
    references: [tenants.id],
  }),
  user: one(accounts, {
    fields: [tenantUsers.userId],
    references: [accounts.userId],
  }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [orders.tenantId],
    references: [tenants.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));
