import {profileDb} from '../db/profiles';
import {defaultProducts,StockProduct} from './catalog';
export interface StockMovement{id:string;productId:number;type:string;amount:number;delta:number;before:number;after:number;reason:string;reference:string;actorId:string;actorEmail:string;actorName?:string;createdAt:string}
export async function readStock():Promise<StockProduct[]>{
  try {
    const db = profileDb();
    let productsResult = await db.prepare('SELECT id, sku, name, category, price, tax, unit, image_src as imageSrc, image_id as imageId, description FROM products').all<any>();
    let products = productsResult.results;
    
    // If empty, populate from defaultProducts
    if (products.length === 0) {
      const stmts = [];
      for (const p of defaultProducts) {
        stmts.push(db.prepare('INSERT INTO products (id, sku, name, category, price, tax, unit, image_id, image_src, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(p.id, p.sku, p.name, p.category, p.price, 22, 'unidad', p.imageId?.toString() || '', p.imageSrc || '', new Date().toISOString(), new Date().toISOString()));
      }
      await db.batch(stmts);
      productsResult = await db.prepare('SELECT id, sku, name, category, price, tax, unit, image_src as imageSrc, image_id as imageId, description FROM products').all<any>();
      products = productsResult.results;
    }

    const stockResult = await db.prepare('SELECT product_id AS productId,quantity,version,updated_at AS updatedAt FROM product_stock').all<{productId:number;quantity:number;version:number;updatedAt:string}>();
    
    return products.map(p => {
      const row = stockResult.results.find(r => r.productId === p.id);
      return {
        ...p,
        stock: row ? row.quantity : 0,
        version: row ? row.version : 0,
        updatedAt: row ? row.updatedAt : new Date().toISOString()
      };
    }) as StockProduct[];
  } catch (err) {
    console.error('Error in readStock:', err);
    return [];
  }
}
export async function readMovements():Promise<StockMovement[]>{return (await profileDb().prepare('SELECT sm.id, sm.product_id AS productId, sm.type, sm.amount, sm.delta, sm.before_quantity AS before, sm.after_quantity AS after, sm.reason, sm.reference, sm.actor_id AS actorId, sm.actor_email AS actorEmail, COALESCE(p.display_name, sm.actor_email) AS actorName, sm.created_at AS createdAt FROM stock_movements sm LEFT JOIN profiles p ON p.user_id=sm.actor_id ORDER BY sm.created_at DESC, sm.id DESC LIMIT 100').all<StockMovement>()).results}

