import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CliModule } from './cli/cli.module';

const logger = new Logger('CLI');

async function bootstrap() {
  const args = process.argv.slice(2);

  // Check arguments BEFORE creating the application context
  if (args.length < 2) {
    console.error('❌ Fehler: Fehlende Parameter');
    console.error('');
    console.error('Verwendung:');
    console.error('  pnpm admin:reset <username> <newPassword>');
    console.error('');
    console.error('Beispiel:');
    console.error('  pnpm admin:reset admin NewSecurePassword123!');
    console.error('');
    process.exit(1);
  }

  // Disable NestJS default logger for clean CLI output
  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: false,
  });

  try {
    // Dynamic import to avoid circular dependencies
    const { AdminResetPasswordCommand } = await import(
      './cli/commands/admin-reset-password.command'
    );
    const command = app.get(AdminResetPasswordCommand);

    await command.run(args);
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('Command execution failed:', error.stack);
    logger.error(`❌ Fehler: ${error.message}`);

    // Ensure app is closed properly, even if it fails
    try {
      await app.close();
      logger.debug('Application closed successfully');
    } catch (closeError) {
      logger.error('Failed to close application gracefully:', closeError);
    }

    // Re-throw the original error to let the shell wrapper handle the exit code
    throw error;
  }
}

bootstrap().catch((error) => {
  logger.error('❌ CLI Bootstrap failed:', error);
  // Let the process exit naturally with the error code
  throw error;
});
