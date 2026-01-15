/**
 * Prisma v7 Configuration
 *
 * Zentralisiert die Prisma CLI Konfiguration und Environment-Management.
 * Diese Datei wird vom Prisma CLI für Migrations, Seeding und andere Operationen verwendet.
 *
 * WICHTIG: Wir verwenden `process.env` statt Prisma's `env()` Helper, da `env()` einen
 * Fehler wirft wenn die Variable nicht existiert. Mit `process.env` und Fallback
 * funktioniert `prisma generate` auch in CI-Umgebungen ohne echte Datenbankverbindung
 * (z.B. macOS/Windows Builds). Migrations und andere DB-Operationen benötigen
 * weiterhin eine gültige DATABASE_URL.
 */

import '@dotenvx/dotenvx/config';
import { defineConfig } from 'prisma/config';

/**
 * Fallback-URL für CI-Umgebungen ohne echte Datenbank.
 * Nur für `prisma generate` relevant - alle anderen Operationen benötigen eine echte DB.
 */
const CI_FALLBACK_URL = 'postgresql://ci:ci@localhost:5432/ci';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL || CI_FALLBACK_URL,
  },
});
