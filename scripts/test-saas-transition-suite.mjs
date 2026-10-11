// ============================================================================
// SUITE DE VERIFICACIÓN AUTOMATIZADA: TRANSICIÓN A SAAS PRIVADO Y MULTI-TENANT
// ============================================================================
// Comprueba:
// 1. Jerarquía de cuentas (Platform Owners vs Tenant Owner integemini)
// 2. Normalización y resolución de RUT (tenant_settings)
// 3. Login obligatorio con RUT, credenciales y verificación de membresía
// 4. Aislamiento estricto multi-tenant (anti-manipulación de cookies)
// 5. Retirada de acceso anónimo en APIs (products, orders)
// ============================================================================

import assert from 'node:assert/strict';
import {
  normalizeRut,
  resolveTenantByRut,
  resolveSessionTenantSlug,
  isUserPlatformOrTenantAdmin,
  resolveTenantContext,
  extractTenantSlugFromRequest,
} from '../lib/tenant-context.ts';
import { isPlatformOwner } from '../lib/platform.ts';
import { requireApiPermission } from '../lib/api-auth.ts';

// Mock de base de datos D1 para pruebas exhaustivas
function createMockD1Database() {
  const store = {
    accounts: [
      { user_id: 'usr_po1', email: 'caordamian@gmail.com', status: 'active' },
      { user_id: 'usr_po2', email: 'brunosaravia09@gmail.com', status: 'active' },
      { user_id: 'usr_inte', email: 'integemini@gmail.com', status: 'active' },
      { user_id: 'usr_emp1', email: 'empleado@barraca.uy', status: 'active' },
      { user_id: 'usr_ext1', email: 'usuario@otraempresa.uy', status: 'active' },
    ],
    platform_users: [
      { user_id: 'usr_po1', role: 'platform_owner', status: 'active' },
      { user_id: 'usr_po2', role: 'platform_owner', status: 'active' },
      // IMPORTANTE: integemini NUNCA está en platform_users
    ],
    tenants: [
      { id: 'tnt_barraca', slug: 'barraca-uno', name: 'Barraca UNO', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      { id: 'tnt_otra', slug: 'ferreteria-sur', name: 'Ferretería Sur', status: 'active', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z' },
      { id: 'tnt_susp', slug: 'empresa-suspendida', name: 'Empresa Suspendida', status: 'suspended', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    ],
    tenant_users: [
      { tenant_id: 'tnt_barraca', user_id: 'usr_inte', role: 'owner', status: 'active' },
      { tenant_id: 'tnt_barraca', user_id: 'usr_emp1', role: 'employee', status: 'active' },
      { tenant_id: 'tnt_otra', user_id: 'usr_ext1', role: 'owner', status: 'active' },
    ],
    tenant_settings: [
      { tenant_id: 'tnt_barraca', key: 'rut', value: '218492010019' },
      { tenant_id: 'tnt_otra', key: 'rut', value: '219999990011' },
      { tenant_id: 'tnt_susp', key: 'rut', value: '215555550012' },
    ],
    products: [
      { id: 1, tenant_id: 'tnt_barraca', sku: 'TUBO-01', name: 'Tubo PVC 110', price: 450 },
      { id: 2, tenant_id: 'tnt_otra', sku: 'CLAV-01', name: 'Clavos 2 pulg', price: 120 },
    ],
  };

  return {
    prepare(query) {
      let boundValues = [];
      return {
        bind(...values) {
          boundValues = values;
          return this;
        },
        async first() {
          const q = query.toLowerCase();

          // platform_users
          if (q.includes('from platform_users') && q.includes('user_id = ?')) {
            const uid = boundValues[0];
            const row = store.platform_users.find(pu => pu.user_id === uid && pu.status === 'active');
            if (row) return { userId: row.user_id, role: row.role, status: row.status };
            return null;
          }

          // tenant_settings + tenants JOIN por RUT
          if (q.includes('from tenant_settings') && q.includes("key = 'rut'") && q.includes('value = ?')) {
            const rutVal = boundValues[0];
            const setting = store.tenant_settings.find(s => s.key === 'rut' && s.value === rutVal);
            if (!setting) return null;
            const t = store.tenants.find(t => t.id === setting.tenant_id);
            if (!t) return null;
            return { id: t.id, slug: t.slug, name: t.name, status: t.status, createdAt: t.created_at, updatedAt: t.updated_at };
          }

          // tenants por slug
          if (q.includes('from tenants') && q.includes('slug = ?')) {
            const slug = boundValues[0];
            const t = store.tenants.find(t => t.slug === slug);
            if (!t) return null;
            return { id: t.id, slug: t.slug, name: t.name, status: t.status, createdAt: t.created_at, updatedAt: t.updated_at };
          }

          // tenant_users por tenant_id y user_id
          if (q.includes('from tenant_users') && q.includes('tenant_id = ?') && q.includes('user_id = ?')) {
            const tid = boundValues[0];
            const uid = boundValues[1];
            const tu = store.tenant_users.find(m => m.tenant_id === tid && m.user_id === uid);
            if (!tu) return null;
            return { tenantId: tu.tenant_id, userId: tu.user_id, role: tu.role, status: tu.status, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
          }

          // tenant_users admin check
          if (q.includes('from tenant_users') && q.includes('user_id = ?') && q.includes("status = 'active'")) {
            const uid = boundValues[0];
            const tu = store.tenant_users.find(m => m.user_id === uid && m.status === 'active' && (m.role === 'owner' || m.role === 'admin'));
            return tu ? { present: 1 } : null;
          }

          // accounts por user_id
          if (q.includes('from accounts') && q.includes('user_id = ?')) {
            const uid = boundValues[0];
            const a = store.accounts.find(acc => acc.user_id === uid);
            if (!a) return null;
            return { userId: a.user_id, email: a.email, status: a.status };
          }

          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          return { meta: { changes: 1 } };
        },
      };
    },
  };
}

async function runTests() {
  console.log('🧪 Iniciando Suite de Transición a SaaS Privado Dambru Solutions...\n');
  const mockDb = createMockD1Database();

  let passed = 0;
  let failed = 0;

  function test(description, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(description, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  console.log('1. JERARQUÍA DE CUENTAS & BOOTSTRAP DATA:');
  // --------------------------------------------------------------------------

  await testAsync('Platform Owner caordamian@gmail.com tiene autoridad global', async () => {
    const user = { userId: 'usr_po1', email: 'caordamian@gmail.com' };
    const isPO = await isPlatformOwner(user, mockDb);
    assert.equal(isPO, true);
  });

  await testAsync('Platform Owner brunosaravia09@gmail.com tiene autoridad global', async () => {
    const user = { userId: 'usr_po2', email: 'brunosaravia09@gmail.com' };
    const isPO = await isPlatformOwner(user, mockDb);
    assert.equal(isPO, true);
  });

  await testAsync('integemini@gmail.com NO es Platform Owner (nunca tiene authority global)', async () => {
    const user = { userId: 'usr_inte', email: 'integemini@gmail.com' };
    const isPO = await isPlatformOwner(user, mockDb);
    assert.equal(isPO, false);
  });

  await testAsync('integemini@gmail.com es owner de Barraca Uno a través de tenant_users', async () => {
    const user = { userId: 'usr_inte', email: 'integemini@gmail.com' };
    const isAdmin = await isUserPlatformOrTenantAdmin(user, 'barraca-uno', mockDb);
    assert.equal(isAdmin, true);
  });

  await testAsync('integemini@gmail.com NO tiene autoridad sobre Ferretería Sur (aislamiento entre tenants)', async () => {
    const user = { userId: 'usr_inte', email: 'integemini@gmail.com' };
    const ctx = await resolveTenantContext({ tenantSlug: 'ferreteria-sur', user, db: mockDb });
    assert.notEqual(ctx, null);
    assert.equal(ctx.effectiveRole, null);
    assert.equal(ctx.permissions.has('products:write'), false);
    assert.equal(ctx.permissions.has('orders:manage'), false);
  });

  // --------------------------------------------------------------------------
  console.log('\n2. NORMALIZACIÓN Y RESOLUCIÓN DE RUT (tenant_settings):');
  // --------------------------------------------------------------------------

  test('normalizeRut limpia guiones, puntos y espacios', () => {
    assert.equal(normalizeRut('21.849.201-0019'), '218492010019');
    assert.equal(normalizeRut(' 21 849 201 0019 '), '218492010019');
    assert.equal(normalizeRut('RUT: 218492010019'), '218492010019');
  });

  await testAsync('resolveTenantByRut encuentra Barraca Uno por su RUT oficial 218492010019', async () => {
    const tenant = await resolveTenantByRut('218492010019', mockDb);
    assert.notEqual(tenant, null);
    assert.equal(tenant.slug, 'barraca-uno');
    assert.equal(tenant.name, 'Barraca UNO');
    assert.equal(tenant.status, 'active');
  });

  await testAsync('resolveTenantByRut encuentra Ferretería Sur por su RUT', async () => {
    const tenant = await resolveTenantByRut('219999990011', mockDb);
    assert.notEqual(tenant, null);
    assert.equal(tenant.slug, 'ferreteria-sur');
    assert.equal(tenant.status, 'active');
  });

  await testAsync('resolveTenantByRut retorna null para RUT inexistente', async () => {
    const tenant = await resolveTenantByRut('210000000000', mockDb);
    assert.equal(tenant, null);
  });

  await testAsync('resolveTenantByRut detecta tenant suspendido', async () => {
    const tenant = await resolveTenantByRut('215555550012', mockDb);
    assert.notEqual(tenant, null);
    assert.equal(tenant.status, 'suspended');
  });

  // --------------------------------------------------------------------------
  console.log('\n3. RESOLUCIÓN DE TENANT DE SESIÓN & ANTI-MANIPULACIÓN:');
  // --------------------------------------------------------------------------

  await testAsync('Usuario de Barraca Uno con cookie legítima barraca-uno resuelve barraca-uno', async () => {
    const user = { userId: 'usr_inte', email: 'integemini@gmail.com' };
    const slug = await resolveSessionTenantSlug(user, 'barraca-uno', mockDb);
    assert.equal(slug, 'barraca-uno');
  });

  await testAsync('Usuario de Barraca Uno manipulando cookie a ferreteria-sur es rechazado (fallback a su propio tenant)', async () => {
    const user = { userId: 'usr_inte', email: 'integemini@gmail.com' };
    // El usuario intenta falsificar dambru_tenant='ferreteria-sur' en el cliente
    const slug = await resolveSessionTenantSlug(user, 'ferreteria-sur', mockDb);
    // El servidor detecta que NO tiene membresía en ferreteria-sur y NO le permite acceder a ese tenant
    assert.notEqual(slug, 'ferreteria-sur');
  });

  await testAsync('Platform Owner con cookie ferreteria-sur es autorizado por autoridad global', async () => {
    const user = { userId: 'usr_po1', email: 'caordamian@gmail.com' };
    const slug = await resolveSessionTenantSlug(user, 'ferreteria-sur', mockDb);
    assert.equal(slug, 'ferreteria-sur');
  });

  // --------------------------------------------------------------------------
  console.log('\n4. RETIRADA DE ECOMMERCE PÚBLICO & HARDENING DE APIS:');
  // --------------------------------------------------------------------------

  await testAsync('GET /api/products rechaza visitante anónimo (401 Unauthorized)', async () => {
    const dummyReq = new Request('http://localhost:5173/api/products');
    const auth = await requireApiPermission(dummyReq, 'products:read', {
      userOverride: null,
      db: mockDb,
    });
    assert.equal(auth.authorized, false);
    assert.equal(auth.response?.status, 401);
  });

  await testAsync('GET /api/products autoriza usuario con membresía activa en el tenant', async () => {
    const dummyReq = new Request('http://localhost:5173/api/products', {
      headers: { 'x-tenant-slug': 'barraca-uno' },
    });
    const user = { userId: 'usr_inte', email: 'integemini@gmail.com' };
    const auth = await requireApiPermission(dummyReq, 'products:read', {
      userOverride: user,
      db: mockDb,
    });
    assert.equal(auth.authorized, true);
    assert.notEqual(auth.context, null);
    assert.equal(auth.context.tenant.slug, 'barraca-uno');
  });

  await testAsync('Usuario no puede realizar mutaciones en un tenant ajeno (403 Forbidden)', async () => {
    const dummyReq = new Request('http://localhost:5173/api/products', {
      headers: { 'x-tenant-slug': 'ferreteria-sur' },
    });
    const user = { userId: 'usr_inte', email: 'integemini@gmail.com' };
    const auth = await requireApiPermission(dummyReq, 'products:write', {
      userOverride: user,
      db: mockDb,
    });
    assert.equal(auth.authorized, false);
    assert.equal(auth.response?.status, 403);
  });

  test('extractTenantSlugFromRequest lee dambru_tenant de cookies', () => {
    const req = new Request('http://localhost:5173/api/test', {
      headers: { cookie: 'dambru_tenant=ferreteria-sur; other=1' },
    });
    const slug = extractTenantSlugFromRequest(req);
    assert.equal(slug, 'ferreteria-sur');
  });

  console.log('\n============================================================');
  console.log(`🏁 Resumen: ${passed} pasadas, ${failed} fallidas (Total: ${passed + failed})`);
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
