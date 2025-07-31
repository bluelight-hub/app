import { CommandFactory } from 'nest-commander';
import { CliSimpleModule } from './cli/cli-simple.module';
import { logger } from './logger/consola.logger';

/**
 * Bootstrap-Funktion für die Threat Rules CLI-Anwendung.
 * Separater Entry-Point ohne komplexe Module-Dependencies.
 */
async function bootstrap() {
  try {
    // CLI ohne automatisches Schließen ausführen
    const app = await CommandFactory.runWithoutClosing(CliSimpleModule, {
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
