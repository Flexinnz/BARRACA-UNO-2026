// ============================================================================
// FASE 1.2.7 — SCRIPT DE SEED: PLATFORM OWNERS
// ============================================================================
// Ejecuta el seed idempotente y no destructivo de los dos Platform Owners.
// No modifica ningún dato de tenants, memberships ni organizaciones.
//
// Uso:
//   node scripts/seed-platform.mjs
// ============================================================================

import { seedPlatformOwners } from '../lib/platform.ts';

async function main() {
  console.log('🚀 Iniciando Seed Idempotente de Platform Owners...');

  try {
    const result = await seedPlatformOwners();

    console.log('\n✅ Platform Owners configurados en platform_users:');
    for (const po of result.platformOwners) {
      console.log(
        `   - ${po.email} (userId: ${po.userId}, cuenta creada: ${po.accountCreated ? 'sí' : 'reutilizada'}, rol asignado: sí)`
      );
    }

    console.log('\n✨ Seed de Platform Owners completado con éxito de forma 100% no destructiva e idempotente.');
  } catch (error) {
    console.error('❌ Error durante la ejecución del seed:', error);
    process.exit(1);
  }
}

main();
