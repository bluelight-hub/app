/**
 * Prisma v7 Configuration
 *
 * Zentralisiert die Prisma CLI Konfiguration und Environment-Management.
 * Diese Datei wird vom Prisma CLI für Migrations, Seeding und andere Operationen verwendet.
 */

import '@dotenvx/dotenvx/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
