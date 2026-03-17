import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { InviteCliModule } from './cli/invite-cli.module';

const logger = new Logger('CLI:InviteOnce');

async function bootstrap() {
  const args = process.argv.slice(2);
  const hasCreatorSelector = args.includes('--username') || args.includes('--user-id');

  if (!hasCreatorSelector) {
    console.error('❌ Fehler: Fehlendes Required Argument');
    console.error('');
    console.error('Verwendung:');
    console.error('  pnpm cli:invite-once --username <name> [--label <text>] [--days <n>]');
    console.error('  pnpm cli:invite-once --user-id <id> [--label <text>] [--expires-at <iso>]');
    console.error('');
    console.error('Parameter:');
    console.error('  --username <name>   Admin-Benutzername als Ersteller');
    console.error('  --user-id <id>      Admin-User-ID als Ersteller');
    console.error('  --label <text>      Optionales Label');
    console.error('  --days <n>          Ablauf in n Tagen (default: 7)');
    console.error('  --expires-at <iso>  Exaktes ISO-8601 Ablaufdatum');
    console.error('');
    console.error('Beispiele:');
    console.error('  pnpm cli:invite-once --username admin');
    console.error('  pnpm cli:invite-once --username admin --label "Ring 2 Zugang" --days 3');
    console.error('  pnpm cli:invite-once --user-id usr_123 --expires-at 2026-03-20T12:00:00.000Z');
    console.error('');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(InviteCliModule, {
    logger: false,
  });

  try {
    const { CreateOneTimeInviteCliCommand } = await import('./cli/commands/create-one-time-invite.command');
    const command = app.get(CreateOneTimeInviteCliCommand);

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
