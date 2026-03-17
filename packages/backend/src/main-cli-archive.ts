import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CliModule } from './cli/cli.module';

const logger = new Logger('CLI:Archive');

/**
 * CLI Entry Point für Bulk-Archivierung alter Einsätze.
 *
 * Dieser Entry Point ist spezifisch für den archive:old-einsaetze Command,
 * folgt dem bestehenden CLI-Pattern (siehe main-cli.ts für admin:reset).
 *
 * **Verwendung:**
 * ```bash
 * # Dry-run (Preview)
 * pnpm cli:archive --user admin-id
 *
 * # Actual archival
 * pnpm cli:archive --user admin-id --execute
 *
 * # Mit custom Threshold
 * pnpm cli:archive --user admin-id --execute --years 5
 * ```
 *
 * **Warum separates Entry Script:**
 * - Klar definierte CLI-Command-Struktur
 * - Einfaches Error Handling pro Command
 * - Konsistente Argument-Validierung
 * - Saubere package.json Scripts
 */
async function bootstrap() {
  const args = process.argv.slice(2);

  // Argument validation BEFORE creating app context
  if (!args.includes('--user')) {
    console.error('❌ Fehler: Fehlendes Required Argument');
    console.error('');
    console.error('Verwendung:');
    console.error('  pnpm cli:archive --user <userId> [--execute] [--years <n>]');
    console.error('');
    console.error('Parameter:');
    console.error('  --user <id>     User ID für Audit Trail (Required)');
    console.error('  --execute       Führt Archivierung aus (default: dry-run)');
    console.error('  --years <n>     Alter in Jahren (default: 10)');
    console.error('');
    console.error('Beispiele:');
    console.error('  pnpm cli:archive --user admin-123');
    console.error('  pnpm cli:archive --user admin-123 --execute');
    console.error('  pnpm cli:archive --user admin-123 --execute --years 5');
    console.error('');
    process.exit(1);
  }

  // Disable NestJS default logger for clean CLI output
  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: false,
  });

  try {
    // Dynamic import to avoid circular dependencies
    const { ArchiveOldEinsaetzeCliCommand } = await import('./cli/commands/archive-old-einsaetze.command');
    const command = app.get(ArchiveOldEinsaetzeCliCommand);

    await command.run(args);
    await app.close();
    process.exit(0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error(`❌ Fehler: ${message}`);
    if (stack) {
      logger.error('Command execution failed:', stack);
    }

    // Ensure app is closed properly, even if it fails
    try {
      await app.close();
      logger.debug('Application closed successfully');
    } catch (closeError) {
      console.error('❌ Fehler beim Schließen des CLI-Kontexts:', closeError);
    }

    process.exit(1);
  }
}

bootstrap().catch((error: unknown) => {
  console.error('❌ CLI Bootstrap failed:');
  console.error(error);
  process.exit(1);
});
