// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('profiles',{
  userId:text('user_id').primaryKey(),
  email:text('email').notNull(),
  displayName:text('display_name').notNull(),
  company:text('company').notNull().default(''),
  phone:text('phone').notNull().default(''),
  bio:text('bio').notNull().default(''),
  avatar:text('avatar').notNull().default('initials'),
  accent:text('accent').notNull().default('ocean'),
  theme:text('theme').notNull().default('dark'),
  density:text('density').notNull().default('comfortable'),
  updatedAt:text('updated_at').notNull(),
});
export const accounts=sqliteTable('accounts',{
 userId:text('user_id').primaryKey(),
 email:text('email').notNull(),
 status:text('status').notNull().default('active'),
 createdAt:text('created_at').notNull(),
 lastSeenAt:text('last_seen_at').notNull(),
 updatedAt:text('updated_at').notNull(),
});
export const accountEvents=sqliteTable('account_events',{
 id:integer('id').primaryKey({autoIncrement:true}),
 actorId:text('actor_id').notNull(),
 targetId:text('target_id').notNull(),
 targetEmail:text('target_email').notNull(),
 action:text('action').notNull(),
 createdAt:text('created_at').notNull(),
});
export const productStock=sqliteTable('product_stock',{
 productId:integer('product_id').primaryKey(),
 quantity:integer('quantity').notNull(),
 version:integer('version').notNull().default(0),
 updatedAt:text('updated_at').notNull(),
});
export const stockMovements=sqliteTable('stock_movements',{
 id:text('id').primaryKey(),
 productId:integer('product_id').notNull(),
 type:text('type').notNull(),
 amount:integer('amount').notNull(),
 delta:integer('delta').notNull(),
 before:integer('before_quantity').notNull(),
 after:integer('after_quantity').notNull(),
 reason:text('reason').notNull(),
 reference:text('reference').notNull().default(''),
 actorId:text('actor_id').notNull(),
 actorEmail:text('actor_email').notNull(),
 createdAt:text('created_at').notNull(),
});

export const accountIdentities=sqliteTable('account_identities',{providerUserId:text('provider_user_id').primaryKey(),accountUserId:text('account_user_id').notNull()});

export const userCredentials=sqliteTable('user_credentials',{
  userId:text('user_id').primaryKey(),
  passwordHash:text('password_hash').notNull(),
  salt:text('salt').notNull(),
  createdAt:text('created_at').notNull(),
});

export const userSessions=sqliteTable('user_sessions',{
  token:text('token').primaryKey(),
  userId:text('user_id').notNull(),
  expiresAt:text('expires_at').notNull(),
  createdAt:text('created_at').notNull(),
});
