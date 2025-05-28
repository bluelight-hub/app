import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli/cli.module';
import { logger } from './logger/consola.logger';

/**
 * Bootstrap-Funktion für die CLI-Anwendung.
 * Initialisiert und startet die NestJS Commander CLI mit dem CliModule.
 * Beendet die Anwendung ordnungsgemäß nach der Befehlsausführung.
 */
async function bootstrap() {
  try {
    // CLI ohne automatisches Schließen ausführen
    const app = await CommandFactory.runWithoutClosing(CliModule, {
      logger: ['log', 'error', 'warn'],
    });

    // Anwendung explizit schließen nach der Befehlsausführung
    await app.close();

    // Prozess erfolgreich beenden
    process.exit(0);
  } catch (error) {
    logger.error('CLI-Fehler:', error);
    // Prozess mit Fehlercode beenden
    process.exit(1);
  }
}

bootstrap();