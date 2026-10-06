import { getChatGPTUser } from '../../../chatgpt-auth';
import { isCompanyAdmin } from '../../../../lib/accounts';
import { profileDb } from '../../../../db/profiles';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user || !isCompanyAdmin(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const db = profileDb();
  
  const orders = await db.prepare('SELECT status, total, created_at FROM orders ORDER BY created_at DESC').all<{status: string, total: number, created_at: string}>();
  const profiles = await db.prepare('SELECT COUNT(*) as count FROM profiles').first<{count: number}>();
  
  const totalRevenue = orders.results.reduce((acc, o) => acc + o.total, 0);
  const pendingOrders = orders.results.filter(o => o.status === 'pending').length;
  
  return Response.json({
    totalRevenue,
    pendingOrders,
    users: profiles?.count || 0,
    recentOrders: orders.results.slice(0, 5)
  });
}
