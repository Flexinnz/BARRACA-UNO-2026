// ============================================================================
// SUITE DE PRUEBAS AUTOMATIZADAS: MÓDULO DE CLIENTES / CRM & RBAC
// ============================================================================

import { customersRepository } from '../lib/data/index.ts';
import { hasTenantPermission } from '../lib/permissions.ts';

function createMockD1Database() {
  const store = {
    accounts: [
      {
        user_id: 'usr_c1',
        email: 'cliente1@obra.uy',
        status: 'active',
        created_at: '2026-03-01T10:00:00Z',
        last_seen_at: new Date().toISOString(),
        updated_at: '2026-03-01T10:00:00Z',
      },
      {
        user_id: 'usr_c2',
        email: 'cliente2@constructora.com',
        status: 'active',
        created_at: '2026-02-15T10:00:00Z',
        last_seen_at: '2026-02-15T10:00:00Z',
        updated_at: '2026-02-15T10:00:00Z',
      },
      {
        user_id: 'usr_admin',
        email: 'caordamian@gmail.com', // Admin email que debe filtrarse
        status: 'active',
        created_at: '2026-01-01T10:00:00Z',
        last_seen_at: new Date().toISOString(),
        updated_at: '2026-01-01T10:00:00Z',
      },
    ],
    profiles: [
      {
        user_id: 'usr_c1',
        email: 'cliente1@obra.uy',
        display_name: 'Santiago Arq',
        company: 'Estudio Arq',
        phone: '099111222',
        bio: 'Cliente frecuente de herrajes y perfiles',
        updated_at: '2026-03-01T10:00:00Z',
      },
      {
        user_id: 'usr_c2',
        email: 'cliente2@constructora.com',
        display_name: 'Constructora Sur',
        company: 'Sur SA',
        phone: '098333444',
        bio: 'Obras en Maldonado',
        updated_at: '2026-02-15T10:00:00Z',
      },
      {
        user_id: 'usr_admin',
        email: 'caordamian@gmail.com',
        display_name: 'Damian Admin',
        company: 'Barraca Uno',
        phone: '099999999',
        bio: 'Platform Owner',
        updated_at: '2026-01-01T10:00:00Z',
      },
    ],
    orders: [
      {
        id: 'OC-101',
        tenant_id: 'tnt_barraca_uno_default',
        user_id: 'usr_c1',
        user_email: 'cliente1@obra.uy',
        total: 12500,
        status: 'delivered',
        created_at: '2026-03-10T12:00:00Z',
      },
      {
        id: 'OC-102',
        tenant_id: 'tnt_barraca_uno_default',
        user_id: 'usr_c1',
        user_email: 'cliente1@obra.uy',
        total: 8200,
        status: 'delivered',
        created_at: '2026-04-01T15:00:00Z',
      },
    ],
    tenant_users: [
      {
        tenant_id: 'tnt_barraca_uno_default',
        user_id: 'usr_admin',
        role: 'owner',
        status: 'active',
      },
    ],
  };

  return {
    prepare(query) {
      let boundValues = [];
      const stmt = {
        bind(...values) {
          boundValues = values;
          return stmt;
        },
        async first() {
          const res = await stmt.all();
          return res.results[0] || null;
        },
        async all() {
          // SELECT ficha individual
          if (query.includes('WHERE a.user_id = ?')) {
            const targetId = boundValues[boundValues.length - 1];
            const a = store.accounts.find((acc) => acc.user_id === targetId);
            if (!a) return { results: [], meta: { changes: 0 } };

            const prof = store.profiles.find((p) => p.user_id === a.user_id) || {};
            const clientOrders = store.orders.filter(
              (o) => o.user_id === a.user_id && o.status !== 'cancelled'
            );

            return {
              results: [
                {
                  userId: a.user_id,
                  email: a.email,
                  status: a.status,
                  displayName: prof.display_name || a.email,
                  company: prof.company || '',
                  phone: prof.phone || '',
                  bio: prof.bio || '',
                  createdAt: a.created_at,
                  lastSeenAt: a.last_seen_at,
                  updatedAt: a.updated_at,
                  tenantRole: null,
                  platformRole: null,
                  totalSpent: clientOrders.reduce((s, o) => s + o.total, 0),
                  ordersCount: clientOrders.length,
                  lastOrderAt: clientOrders[0]?.created_at || null,
                },
              ],
              meta: { changes: 0 },
            };
          }

          // SELECT listado de clientes
          if (query.includes('FROM accounts a') && query.includes('LEFT JOIN profiles p')) {
            const results = store.accounts
              .filter((a) => a.status !== 'deleted')
              .map((a) => {
                const prof = store.profiles.find((p) => p.user_id === a.user_id) || {};
                const tu = store.tenant_users.find(
                  (u) => u.user_id === a.user_id && u.tenant_id === boundValues[0]
                );
                const clientOrders = store.orders.filter(
                  (o) =>
                    o.user_id === a.user_id &&
                    (o.tenant_id === boundValues[0] || o.tenant_id === null) &&
                    o.status !== 'cancelled'
                );
                const totalSpent = clientOrders.reduce((sum, o) => sum + o.total, 0);
                const ordersCount = clientOrders.length;
                const lastOrderAt =
                  clientOrders.length > 0
                    ? clientOrders[clientOrders.length - 1].created_at
                    : null;

                return {
                  userId: a.user_id,
                  email: a.email,
                  status: a.status,
                  displayName: prof.display_name || a.email,
                  company: prof.company || '',
                  phone: prof.phone || '',
                  bio: prof.bio || '',
                  createdAt: a.created_at,
                  lastSeenAt: a.last_seen_at,
                  updatedAt: a.updated_at,
                  tenantRole: tu ? tu.role : null,
                  platformRole: null,
                  totalSpent,
                  ordersCount,
                  lastOrderAt,
                };
              });

            return { results, meta: { changes: 0 } };
          }

          // SELECT pedidos del cliente
          if (query.includes('FROM orders') && query.includes('WHERE (user_id = ? OR user_email = ?)')) {
            const userId = boundValues[0];
            const userEmail = boundValues[1];
            const orders = store.orders.filter(
              (o) => (o.user_id === userId || o.user_email === userEmail)
            );
            return { results: orders, meta: { changes: 0 } };
          }

          return { results: [], meta: { changes: 0 } };
        },
        async run() {
          // INSERT INTO accounts
          if (query.includes('INSERT INTO accounts')) {
            const [user_id, email, now1, now2, now3] = boundValues;
            store.accounts.push({
              user_id,
              email,
              status: 'active',
              created_at: now1,
              last_seen_at: now2,
              updated_at: now3,
            });
            return { meta: { changes: 1 } };
          }

          // INSERT INTO profiles
          if (query.includes('INSERT INTO profiles')) {
            const [user_id, email, display_name, company, phone, bio, now] = boundValues;
            store.profiles.push({
              user_id,
              email,
              display_name,
              company,
              phone,
              bio,
              updated_at: now,
            });
            return { meta: { changes: 1 } };
          }

          // UPDATE profiles
          if (query.includes('UPDATE profiles')) {
            const [display_name, company, phone, bio, now, user_id] = boundValues;
            const prof = store.profiles.find((p) => p.user_id === user_id);
            if (prof) {
              if (display_name !== null) prof.display_name = display_name;
              if (company !== null) prof.company = company;
              if (phone !== null) prof.phone = phone;
              if (bio !== null) prof.bio = bio;
              prof.updated_at = now;
            }
            return { meta: { changes: 1 } };
          }

          // UPDATE accounts SET status = 'deleted'
          if (query.includes("UPDATE accounts SET status = 'deleted'")) {
            const [now, user_id] = boundValues;
            const acc = store.accounts.find((a) => a.user_id === user_id);
            if (acc) {
              acc.status = 'deleted';
              acc.updated_at = now;
            }
            return { meta: { changes: 1 } };
          }

          // UPDATE accounts (status change)
          if (query.includes('UPDATE accounts SET status = ?')) {
            const [status, now, user_id] = boundValues;
            const acc = store.accounts.find((a) => a.user_id === user_id);
            if (acc) {
              acc.status = status;
              acc.updated_at = now;
            }
            return { meta: { changes: 1 } };
          }

          return { meta: { changes: 1 } };
        },
      };
      return stmt;
    },
  };
}

async function runTests() {
  console.log('🧪 Iniciando suite de verificación: Clientes / CRM & RBAC...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. RBAC Tests: Matriz formal de permisos para clientes
  console.log('1. Verificando matriz de permisos RBAC para clientes:');
  assert(
    hasTenantPermission('owner', 'customers:read') === true,
    'owner tiene customers:read'
  );
  assert(
    hasTenantPermission('owner', 'customers:write') === true,
    'owner tiene customers:write'
  );
  assert(
    hasTenantPermission('owner', 'customers:delete') === true,
    'owner tiene customers:delete'
  );
  assert(
    hasTenantPermission('admin', 'customers:read') === true,
    'admin tiene customers:read'
  );
  assert(
    hasTenantPermission('admin', 'customers:write') === true,
    'admin tiene customers:write'
  );
  assert(
    hasTenantPermission('admin', 'customers:delete') === false,
    'admin NO tiene customers:delete (reservado exclusivamente a owner)'
  );
  assert(
    hasTenantPermission('manager', 'customers:read') === true,
    'manager tiene customers:read'
  );
  assert(
    hasTenantPermission('manager', 'customers:write') === false,
    'manager NO tiene customers:write'
  );
  assert(
    hasTenantPermission('employee', 'customers:read') === false,
    'employee NO tiene customers:read'
  );
  assert(
    hasTenantPermission('viewer', 'customers:read') === false,
    'viewer NO tiene customers:read'
  );

  // 2. Data Layer Tests: Lectura tenant-scoped
  console.log('\n2. Verificando aislamiento y lectura de customersRepository:');
  const mockDb = createMockD1Database();
  const scope = 'tnt_barraca_uno_default';

  const customers = await customersRepository.getCustomers(scope, undefined, mockDb);
  assert(Array.isArray(customers), 'getCustomers retorna un array');
  assert(customers.length === 2, 'getCustomers devuelve los 2 clientes y excluye la cuenta de administrador');

  const c1 = customers.find((c) => c.userId === 'usr_c1');
  assert(c1 !== undefined, 'Cliente usr_c1 presente en el directorio');
  assert(c1.displayName === 'Santiago Arq', 'displayName mapeado correctamente desde profiles');
  assert(c1.company === 'Estudio Arq', 'company mapeado correctamente desde profiles');
  assert(c1.totalSpent === 20700, 'totalSpent calculado correctamente desde pedidos reales (12500 + 8200)');
  assert(c1.ordersCount === 2, 'ordersCount calculado correctamente (2 pedidos)');
  assert(c1.lastOrderAt === '2026-04-01T15:00:00Z', 'lastOrderAt calculado correctamente');

  // Verificar que el admin no figure
  const hasAdmin = customers.some((c) => c.email === 'caordamian@gmail.com');
  assert(!hasAdmin, 'Cuentas de administradores/propietarios excluidas del directorio de clientes');

  // 3. Test de Búsqueda
  console.log('\n3. Verificando filtro y búsqueda de clientes:');
  const searchResults = await customersRepository.getCustomers(
    scope,
    { search: 'Constructora' },
    mockDb
  );
  assert(searchResults.length === 1, 'Búsqueda por "Constructora" devuelve exactamente 1 resultado');
  assert(searchResults[0].userId === 'usr_c2', 'El resultado coincide con usr_c2');

  const emptyResults = await customersRepository.getCustomers(
    scope,
    { search: 'inexistente' },
    mockDb
  );
  assert(emptyResults.length === 0, 'Búsqueda sin coincidencias devuelve array vacío');

  // 4. Test CRUD de Cliente: Creación, Lectura, Actualización y Eliminación
  console.log('\n4. Verificando ciclo de vida del cliente (Create / Read / Update / Delete):');
  const testEmail = 'nuevocliente@test.com';
  const created = await customersRepository.createCustomer(
    scope,
    {
      email: testEmail,
      displayName: 'Nuevo Cliente VIP',
      company: 'Desarrollos Este',
      phone: '099555666',
      bio: 'Contacto para obra en Punta del Este',
    },
    mockDb
  );

  assert(created.userId.startsWith('usr_'), 'createCustomer genera userId con prefijo usr_');
  assert(created.email === testEmail, 'createCustomer guarda el email en minúsculas');
  assert(created.company === 'Desarrollos Este', 'createCustomer guarda la empresa');

  // Obtener ficha completa con historial
  const detail = await customersRepository.getCustomerById(scope, created.userId, mockDb);
  assert(detail !== null, 'getCustomerById encuentra al cliente creado');
  assert(detail.displayName === 'Nuevo Cliente VIP', 'getCustomerById devuelve el displayName correcto');
  assert(Array.isArray(detail.orders), 'getCustomerById devuelve array de pedidos');

  // Actualizar datos del cliente
  const updated = await customersRepository.updateCustomer(
    scope,
    created.userId,
    {
      displayName: 'Nuevo Cliente VIP (Modificado)',
      company: 'Desarrollos Este SA',
      phone: '099777888',
      bio: 'Nota actualizada',
    },
    mockDb
  );
  assert(updated === true, 'updateCustomer retorna true');

  const detailAfterUpdate = await customersRepository.getCustomerById(
    scope,
    created.userId,
    mockDb
  );
  assert(
    detailAfterUpdate.displayName === 'Nuevo Cliente VIP (Modificado)',
    'updateCustomer aplicó el nuevo displayName'
  );
  assert(
    detailAfterUpdate.company === 'Desarrollos Este SA',
    'updateCustomer aplicó la nueva empresa'
  );

  // Soft delete del cliente
  const deleted = await customersRepository.deleteCustomer(scope, created.userId, mockDb);
  assert(deleted === true, 'deleteCustomer retorna true');

  // Verificar que el cliente eliminado no figure en el listado activo
  const activeCustomers = await customersRepository.getCustomers(scope, undefined, mockDb);
  assert(
    !activeCustomers.some((c) => c.userId === created.userId),
    'El cliente eliminado ya no aparece en el listado activo de getCustomers'
  );

  console.log(`\n============================================================`);
  console.log(`🏁 Resumen: ${passed} / ${total} comprobaciones pasaron con éxito.`);
  console.log(`============================================================\n`);
}

runTests().catch((err) => {
  console.error('Error fatal durante las pruebas:', err);
  process.exit(1);
});
