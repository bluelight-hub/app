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
      logger.error('Usage: npm run admin:reset -- <username> <newPassword>');
      logger.error('Example: npm run admin:reset -- admin NewSecurePassword123!');
      process.exit(1);
    }

    // Dynamic import to avoid circular dependencies
    const { AdminResetPasswordCommand } = await import(
      './cli/commands/admin-reset-password.command'
    );
    const command = app.get(AdminResetPasswordCommand);

    await command.run(args);
    process.exit(0);
  } catch (error) {
    const logger = new Logger('CLI');
    logger.error('Command execution failed:', error.stack);
    logger.error(`❌ Fehler: ${error.message}`);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  logger.error('❌ CLI Bootstrap failed:', error);
  process.exit(1);
});
