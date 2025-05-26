import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli/cli.module';

/**
 * Bootstrap-Funktion für die CLI-Anwendung.
 * Initialisiert und startet die NestJS Commander CLI mit dem CliModule.
 */
async function bootstrap() {
  await CommandFactory.run(CliModule, {
    logger: ['log', 'error', 'warn'],
  });
}

bootstrap();