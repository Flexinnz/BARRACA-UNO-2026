import {profileDb} from '../db/profiles';
import {defaultProducts,StockProduct} from './catalog';
export interface StockMovement{id:string;productId:number;type:string;amount:number;delta:number;before:number;after:number;reason:string;reference:string;actorId:string;actorEmail:string;actorName?:string;createdAt:string}
export async function readStock(): Promise<StockProduct[]> {
  try {
    const db = profileDb();
    const result = await db
      .prepare(`
        SELECT 
          p.id, p.sku, p.name, p.category, p.price, p.tax, p.unit,
          p.image_src AS imageSrc, p.image_id AS imageId, p.description,
          COALESCE(s.quantity, 0) AS stock,
          COALESCE(s.version, 0) AS version,
          COALESCE(s.updated_at, p.updated_at) AS updatedAt
        FROM products p
        LEFT JOIN product_stock s ON s.product_id = p.id
        ORDER BY p.id ASC
      `)
      .all<StockProduct>();

    let products = result.results ?? [];

    if (products.length === 0) {
      const stmts = [];
      for (const p of defaultProducts) {
        stmts.push(
          db
            .prepare(
              'INSERT INTO products (id, tenant_id, sku, name, category, price, tax, unit, image_id, image_src, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )
            .bind(
              p.id,
              'tnt_barraca',
              p.sku,
              p.name,
              p.category,
              p.price,
              22,
              'unidad',
              p.imageId?.toString() || '',
              p.imageSrc || '',
              '',
              new Date().toISOString(),
              new Date().toISOString()
            )
        );
      }
      await db.batch(stmts);
      const reload = await db
        .prepare(`
          SELECT 
            p.id, p.sku, p.name, p.category, p.price, p.tax, p.unit,
            p.image_src AS imageSrc, p.image_id AS imageId, p.description,
            COALESCE(s.quantity, 0) AS stock,
            COALESCE(s.version, 0) AS version,
            COALESCE(s.updated_at, p.updated_at) AS updatedAt
          FROM products p
          LEFT JOIN product_stock s ON s.product_id = p.id
          ORDER BY p.id ASC
        `)
        .all<StockProduct>();
      products = reload.results ?? [];
    }

    return products;
  } catch (err) {
    console.error('Error in readStock:', err);
    return [];
  }
}
export async function readMovements():Promise<StockMovement[]>{return (await profileDb().prepare('SELECT sm.id, sm.product_id AS productId, sm.type, sm.amount, sm.delta, sm.before_quantity AS before, sm.after_quantity AS after, sm.reason, sm.reference, sm.actor_id AS actorId, sm.actor_email AS actorEmail, COALESCE(p.display_name, sm.actor_email) AS actorName, sm.created_at AS createdAt FROM stock_movements sm LEFT JOIN profiles p ON p.user_id=sm.actor_id ORDER BY sm.created_at DESC, sm.id DESC LIMIT 100').all<StockMovement>()).results}

