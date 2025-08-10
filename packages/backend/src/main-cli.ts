import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { CliModule } from './cli/cli.module';

const logger = new Logger('CLI');

async function bootstrap() {
  // Disable NestJS default logger for clean CLI output
  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: false,
  });

  try {
    const args = process.argv.slice(2);

    if (args.length < 2) {
      logger.error('Usage: pnpm run admin:reset -- <username> <newPassword>');
      logger.error('Example: pnpm run admin:reset -- admin NewSecurePassword123!');
      await app.close();
      process.exit(1);
    }

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
