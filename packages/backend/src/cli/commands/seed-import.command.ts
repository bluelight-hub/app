import { ImportConfig } from '@/modules/seed/schema';
import { SeedImportService } from '@/modules/seed/seed-import.service';
import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { Command, CommandRunner, Option } from 'nest-commander';
import * as path from 'path';

/**
 * Optionen für den Seed-Import-Befehl.
 */
interface SeedImportOptions {
  /**
   * Pfad zur JSON-Datei die importiert werden soll.
   */
  file?: string;

  /**
   * Validiert die JSON-Datei ohne Import.
   */
  validate?: boolean;

  /**
   * Führt einen Dry-Run durch ohne Datenbank-Änderungen.
   */
  dryRun?: boolean;

  /**
   * Überschreibt bestehende Einsätze bei Konflikten.
   */
  overwrite?: boolean;

  /**
   * Validierungs-Level (strict, moderate, lenient).
   */
  validationLevel?: string;

  /**
   * Behandelt Warnungen als Fehler.
   */
  strictWarnings?: boolean;

  /**
   * Generiert automatische Zeitstempel für ETB-Einträge ohne Zeitstempel.
   */
  autoTimestamps?: boolean;

  /**
   * Zeigt Fortschritt während des Imports an.
   */
  verbose?: boolean;

  /**
   * Liste alle Beispiel-JSON-Dateien im seed-data/examples Verzeichnis.
   */
  listExamples?: boolean;
}

/**
 * CLI-Befehl zum Importieren von Seed-Daten aus JSON-Dateien.
 *
 * Dieser Befehl bietet eine flexible CLI-Schnittstelle zum Importieren von
 * Einsatzdaten aus JSON-Dateien. Er unterstützt verschiedene Modi wie Dry-Run,
 * Validierung und bietet umfassende Fehlerbehandlung.
 *
 * Features:
 * - Validierung von JSON-Dateien gegen definierte Schemas
 * - Dry-Run-Modus zum Testen ohne Datenbankänderungen
 * - Automatische Zeitstempel-Generierung für ETB-Einträge
 * - Fortschrittsanzeige bei verbose-Modus
 * - Auflistung verfügbarer Beispieldateien
 *
 * Verwendung:
 * - npm run cli -- seed:import --file=seed-data/examples/simple-einsatz.json
 * - npm run cli -- seed:import --file=seed-data/examples/manv-scenario.json --dry-run
 * - npm run cli -- seed:import --validate --file=my-data.json
 * - npm run cli -- seed:import --list-examples
 *
 * @example
 * ```bash
 * # Import mit Fortschrittsanzeige
 * npm run cli -- seed:import --file=data.json --verbose
 *
 * # Validierung ohne Import
 * npm run cli -- seed:import --validate --file=data.json --validation-level=strict
 *
 * # Dry-Run mit Überschreiben
 * npm run cli -- seed:import --file=data.json --dry-run --overwrite
 * ```
 */
@Injectable()
@Command({
  name: 'seed:import',
  description:
    'Importiert Seed-Daten aus JSON-Dateien mit umfassender Validierung und Fehlerbehandlung',
})
export class SeedImportCommand extends CommandRunner {
  /** Logger-Instanz für Command-spezifische Ausgaben */
  private readonly logger = new Logger(SeedImportCommand.name);

  /**
   * Erstellt eine neue Instanz des SeedImportCommand
   *
   * @param seedImportService Service für den eigentlichen Import-Prozess
   */
  constructor(private readonly seedImportService: SeedImportService) {
    super();
  }

  /**
   * Führt den Befehl aus.
   *
   * Diese Methode ist der Haupteinstiegspunkt für den seed:import Befehl.
   * Sie orchestriert die verschiedenen Modi (list-examples, validate, import)
   * basierend auf den übergebenen Optionen.
   *
   * @param _passedParams Übergebene Parameter (nicht verwendet)
   * @param options Übergebene Optionen mit Konfiguration für den Import
   * @returns Promise<void>
   * @throws Error bei fehlenden erforderlichen Parametern oder Ausführungsfehlern
   */
  async run(_passedParams: string[], options?: SeedImportOptions): Promise<void> {
    try {
      // Liste aller Beispiel-Dateien anzeigen
      if (options?.listExamples) {
        await this.showExampleFiles();
        return;
      }

      // Datei-Parameter ist erforderlich für alle anderen Operationen
      if (!options?.file) {
        this.logger.error('❌ Datei-Parameter ist erforderlich.');
        this.logger.log('\n💡 Verwendung:');
        this.logger.log('   npm run cli -- seed:import --file=<pfad-zur-json-datei>');
        this.logger.log('   npm run cli -- seed:import --list-examples');
        return;
      }

      // Validierung ohne Import
      if (options?.validate) {
        await this.validateFile(options.file, options);
        return;
      }

      // JSON-Import durchführen
      await this.performImport(options.file, options);
    } catch (error) {
      this.logger.error(`❌ Fehler beim Ausführen des Befehls: ${error.message}`);
    }
  }

  /**
   * Option Parser
   */

  /**
   * Parst die --file Option
   *
   * Verarbeitet den Pfad zur JSON-Datei, die importiert werden soll.
   * Die Datei sollte entweder ein einzelner Einsatz oder eine
   * Bulk-Import-Datei mit mehreren Einsätzen sein.
   *
   * @param {string} val - Der übergebene Dateipfad
   * @returns {string} Der unveränderte Dateipfad
   *
   * @example
   * ```bash
   * npm run cli -- seed:import --file=seed-data/examples/manv-scenario.json
   * npm run cli -- seed:import -f ./my-data.json
   * ```
   */
  @Option({
    flags: '-f, --file [file]',
    description: 'Pfad zur JSON-Datei die importiert werden soll',
    required: false,
  })
  parseFile(val: string): string {
    return val;
  }

  /**
   * Parst die --validate Option
   *
   * Aktiviert den Validierungs-Modus, in dem die JSON-Datei
   * nur validiert, aber nicht importiert wird. Nützlich zum
   * Testen von Dateien vor dem eigentlichen Import.
   *
   * @returns {boolean} Immer true wenn die Option gesetzt ist
   *
   * @example
   * ```bash
   * npm run cli -- seed:import --file=data.json --validate
   * ```
   */
  @Option({
    flags: '--validate',
    description: 'Validiert die JSON-Datei ohne Import durchzuführen',
  })
  parseValidate(): boolean {
    return true;
  }

  /**
   * Parst die --dry-run Option
   *
   * Aktiviert den Dry-Run-Modus, in dem der Import simuliert
   * wird ohne tatsächliche Datenbank-Änderungen vorzunehmen.
   * Zeigt an, was importiert würde.
   *
   * @returns {boolean} Immer true wenn die Option gesetzt ist
   *
   * @example
   * ```bash
   * npm run cli -- seed:import --file=data.json --dry-run
   * ```
   */
  @Option({
    flags: '--dry-run',
    description: 'Führt einen Dry-Run durch ohne Datenbank-Änderungen',
  })
  parseDryRun(): boolean {
    return true;
  }

  /**
   * Parst die --overwrite Option
   *
   * Aktiviert das Überschreiben bestehender Einsätze bei
   * Konflikten. Ohne diese Option werden Konflikte als
   * Fehler gemeldet.
   *
   * @returns {boolean} Immer true wenn die Option gesetzt ist
   *
   * @example
   * ```bash
   * npm run cli -- seed:import --file=data.json --overwrite
   * ```
   */
  @Option({
    flags: '--overwrite',
    description: 'Überschreibt bestehende Einsätze bei Konflikten',
  })
  parseOverwrite(): boolean {
    return true;
  }

  /**
   * Parst die --validation-level Option
   *
   * Setzt das Validierungs-Level für den Import.
   * - strict: Alle Regeln müssen erfüllt sein
   * - moderate: Standard-Validierung mit Toleranzen
   * - lenient: Minimale Validierung für flexible Imports
   *
   * @param {string} val - Das gewünschte Validierungs-Level
   * @returns {string} Das validierte Level
   * @throws {Error} Bei ungültigem Validierungs-Level
   *
   * @example
   * ```bash
   * npm run cli -- seed:import --file=data.json --validation-level=strict
   * ```
   */
  @Option({
    flags: '--validation-level [level]',
    description: 'Validierungs-Level: strict, moderate, lenient (Standard: moderate)',
  })
  parseValidationLevel(val: string): string {
    if (!['strict', 'moderate', 'lenient'].includes(val)) {
      throw new Error('Validation level muss strict, moderate oder lenient sein');
    }
    return val;
  }

  /**
   * Parst die --strict-warnings Option
   *
   * Aktiviert die strikte Behandlung von Warnungen.
   * Wenn gesetzt, werden Warnungen als Fehler behandelt
   * und der Import wird abgebrochen.
   *
   * @returns {boolean} Immer true wenn die Option gesetzt ist
   *
   * @example
   * ```bash
   * npm run cli -- seed:import --file=data.json --strict-warnings
   * ```
   */
  @Option({
    flags: '--strict-warnings',
    description: 'Behandelt Warnungen als Fehler',
  })
  parseStrictWarnings(): boolean {
    return true;
  }

  /**
   * Parst die --auto-timestamps Option
   *
   * Aktiviert die automatische Generierung von Zeitstempeln
   * für ETB-Einträge, die keinen expliziten Zeitstempel haben.
   * Standardmäßig aktiviert.
   *
   * @returns {boolean} Immer true wenn die Option gesetzt ist
   *
   * @example
   * ```bash
   * npm run cli -- seed:import --file=data.json --auto-timestamps
   * ```
   */
  @Option({
    flags: '--auto-timestamps',
    description:
      'Generiert automatische Zeitstempel für ETB-Einträge ohne Zeitstempel (Standard: true)',
  })
  parseAutoTimestamps(): boolean {
    return true;
  }

  /**
   * Parst die --verbose Option
   *
   * Aktiviert die ausführliche Ausgabe mit detailliertem
   * Fortschritt während des Imports. Zeigt einen
   * Fortschrittsbalken und Zwischenschritte an.
   *
   * @returns {boolean} Immer true wenn die Option gesetzt ist
   *
   * @example
   * ```bash
   * npm run cli -- seed:import --file=data.json --verbose
   * npm run cli -- seed:import --file=data.json -v
   * ```
   */
  @Option({
    flags: '-v, --verbose',
    description: 'Zeigt detaillierten Fortschritt während des Imports an',
  })
  parseVerbose(): boolean {
    return true;
  }

  /**
   * Parst die --list-examples Option
   *
   * Zeigt alle verfügbaren Beispiel-JSON-Dateien im
   * seed-data/examples Verzeichnis an. Nützlich zum
   * Erkunden verfügbarer Import-Vorlagen.
   *
   * @returns {boolean} Immer true wenn die Option gesetzt ist
   *
   * @example
   * ```bash
   * npm run cli -- seed:import --list-examples
   * ```
   */
  @Option({
    flags: '--list-examples',
    description: 'Liste alle verfügbaren Beispiel-JSON-Dateien auf',
  })
  parseListExamples(): boolean {
    return true;
  }

  /**
   * Führt den JSON-Import durch.
   *
   * Diese Methode koordiniert den eigentlichen Import-Prozess. Sie erstellt die
   * Import-Konfiguration, ruft den Import-Service auf und gibt detailliertes
   * Feedback über den Import-Verlauf und das Ergebnis.
   *
   * @param filePath Pfad zur zu importierenden JSON-Datei
   * @param options Import-Optionen wie dry-run, overwrite, etc.
   * @returns Promise<void>
   * @private
   * @example
   * ```typescript
   * await this.performImport('data.json', {
   *   dryRun: true,
   *   verbose: true,
   *   validationLevel: 'strict'
   * });
   * ```
   */
  private async performImport(filePath: string, options?: SeedImportOptions): Promise<void> {
    this.logger.log(`📁 Starte Import aus Datei: ${filePath}`);

    // Import-Konfiguration erstellen
    const config: ImportConfig = {
      dryRun: options?.dryRun || false,
      overwriteConflicts: options?.overwrite || false,
      validationLevel: (options?.validationLevel as any) || 'moderate',
      strictWarnings: options?.strictWarnings || false,
      autoTimestamps: options?.autoTimestamps || true,
      progressCallback: options?.verbose ? this.createProgressCallback() : undefined,
    };

    if (config.dryRun) {
      this.logger.log('🔍 Dry-Run-Modus: Keine Datenbank-Änderungen werden vorgenommen');
    }

    try {
      const result = await this.seedImportService.importFromFile(filePath, config);

      if (result.success) {
        this.logger.log('✅ Import erfolgreich abgeschlossen!');
        this.logger.log(`   📊 Statistiken:`);
        this.logger.log(`   - Einsätze erstellt: ${result.einsaetzeCreated}`);
        this.logger.log(`   - ETB-Einträge erstellt: ${result.etbEntriesCreated}`);
        this.logger.log(`   - Anhänge erstellt: ${result.attachmentsCreated}`);
        this.logger.log(`   - Dauer: ${result.durationMs}ms`);

        if (result.warnings.length > 0) {
          this.logger.log(`\n⚠️  Warnungen (${result.warnings.length}):`);
          result.warnings.forEach((warning) => {
            this.logger.warn(`   - ${warning}`);
          });
        }

        if (result.createdEntities.einsaetze.length > 0) {
          this.logger.log(`\n📋 Erstellte Einsätze:`);
          result.createdEntities.einsaetze.forEach((einsatz) => {
            this.logger.log(`   - ${einsatz.name} (ID: ${einsatz.id})`);
          });
        }
      } else {
        this.logger.error('❌ Import fehlgeschlagen!');
        this.logger.log(`\n🚨 Fehler (${result.errors.length}):`);
        result.errors.forEach((error) => {
          this.logger.error(`   - ${error}`);
        });

        if (result.warnings.length > 0) {
          this.logger.log(`\n⚠️  Warnungen (${result.warnings.length}):`);
          result.warnings.forEach((warning) => {
            this.logger.warn(`   - ${warning}`);
          });
        }
      }
    } catch (error) {
      this.logger.error(`❌ Import-Fehler: ${error.message}`);
    }
  }

  /**
   * Validiert eine JSON-Datei ohne Import.
   *
   * Diese Methode führt eine umfassende Validierung der JSON-Datei durch,
   * ohne Daten in die Datenbank zu schreiben. Sie prüft Schema-Konformität,
   * Datenintegrität und gibt detaillierte Fehler- und Warnmeldungen aus.
   *
   * @param filePath Pfad zur zu validierenden JSON-Datei
   * @param options Validierungs-Optionen wie validationLevel und strictWarnings
   * @returns Promise<void>
   * @private
   * @example
   * ```typescript
   * await this.validateFile('data.json', {
   *   validationLevel: 'strict',
   *   strictWarnings: true
   * });
   * ```
   */
  private async validateFile(filePath: string, options?: SeedImportOptions): Promise<void> {
    this.logger.log(`🔍 Validiere JSON-Datei: ${filePath}`);

    const config: ImportConfig = {
      validationLevel: (options?.validationLevel as any) || 'moderate',
      strictWarnings: options?.strictWarnings || false,
    };

    try {
      const result = await this.seedImportService.validateFile(filePath, config);

      if (result.valid) {
        this.logger.log('✅ JSON-Datei ist gültig!');
        this.logger.log(`   📊 Details:`);
        this.logger.log(`   - Format: ${result.detectedFormat}`);
        this.logger.log(`   - Schema-Version: ${result.metadata.schemaVersion || 'N/A'}`);
        this.logger.log(`   - Einsätze: ${result.metadata.einsaetzeCount}`);
        this.logger.log(`   - ETB-Einträge: ${result.metadata.etbEntriesCount}`);
        this.logger.log(
          `   - Geschätzte Größe: ${this.formatBytes(result.metadata.estimatedSizeBytes)}`,
        );

        if (result.warnings.length > 0) {
          this.logger.log(`\n⚠️  Warnungen (${result.warnings.length}):`);
          result.warnings.forEach((warning) => {
            this.logger.warn(`   - ${warning.message}`);
            if (warning.recommendation) {
              this.logger.warn(`     💡 ${warning.recommendation}`);
            }
          });
        }

        this.logger.log(`\n💡 Import durchführen:`);
        this.logger.log(`   npm run cli -- seed:import --file="${filePath}"`);
        this.logger.log(`   npm run cli -- seed:import --file="${filePath}" --dry-run`);
      } else {
        this.logger.error('❌ JSON-Datei ist ungültig!');
        this.logger.log(`\n🚨 Fehler (${result.errors.length}):`);
        result.errors.forEach((error) => {
          this.logger.error(`   - ${error.message}`);
          if (error.instancePath) {
            this.logger.error(`     📍 Pfad: ${error.instancePath}`);
          }
        });

        if (result.warnings.length > 0) {
          this.logger.log(`\n⚠️  Warnungen (${result.warnings.length}):`);
          result.warnings.forEach((warning) => {
            this.logger.warn(`   - ${warning.message}`);
          });
        }
      }
    } catch (error) {
      this.logger.error(`❌ Validierungs-Fehler: ${error.message}`);
    }
  }

  /**
   * Zeigt alle verfügbaren Beispiel-Dateien an.
   *
   * Diese Methode listet alle JSON-Dateien im seed-data/examples Verzeichnis auf.
   * Für jede Datei werden Metadaten wie Name, Beschreibung, Kategorie und Größe
   * angezeigt. Zusätzlich wird der passende Import-Befehl für jede Datei generiert.
   *
   * @returns Promise<void>
   * @private
   * @throws Error bei Fehlern beim Lesen des Verzeichnisses oder der Dateien
   */
  private async showExampleFiles(): Promise<void> {
    this.logger.log('\n📋 Verfügbare Beispiel-JSON-Dateien:');
    this.logger.log('=====================================');

    const examplesDir = path.join(process.cwd(), 'seed-data', 'examples');

    try {
      const files = await fs.readdir(examplesDir);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      if (jsonFiles.length === 0) {
        this.logger.warn('⚠️  Keine Beispiel-Dateien im Verzeichnis seed-data/examples gefunden.');
        return;
      }

      for (const file of jsonFiles) {
        const filePath = path.join(examplesDir, file);
        try {
          const stats = await fs.stat(filePath);
          const fileContent = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(fileContent);

          this.logger.log(`📄 ${file}`);
          this.logger.log(`   Größe: ${this.formatBytes(stats.size)}`);

          if (data.metadata) {
            this.logger.log(`   Name: ${data.metadata.name}`);
            this.logger.log(`   Beschreibung: ${data.metadata.description}`);
            this.logger.log(`   Kategorie: ${data.metadata.category || 'N/A'}`);
            this.logger.log(`   Priorität: ${data.metadata.priority || 'N/A'}`);
          } else if (data.einsatz) {
            this.logger.log(`   Einsatz: ${data.einsatz.name}`);
          }

          this.logger.log(
            `   💡 Import: npm run cli -- seed:import --file=seed-data/examples/${file}`,
          );
          this.logger.log('');
        } catch (parseError) {
          this.logger.error(`   ❌ Fehler beim Lesen der Datei: ${parseError.message}`);
          this.logger.log('');
        }
      }
    } catch (error) {
      this.logger.error(`❌ Fehler beim Lesen des Beispiel-Verzeichnisses: ${error.message}`);
      this.logger.log(`💡 Stelle sicher, dass das Verzeichnis ${examplesDir} existiert.`);
    }
  }

  /**
   * Erstellt einen Progress-Callback für verbose Ausgabe.
   *
   * Diese Methode generiert eine Callback-Funktion, die während des Imports
   * aufgerufen wird, um den Fortschritt anzuzeigen. Die Ausgabe enthält einen
   * visuellen Fortschrittsbalken und die aktuelle Verarbeitungsphase.
   *
   * @returns Callback-Funktion für Fortschrittsanzeige
   * @private
   * @example
   * ```typescript
   * const progressCallback = this.createProgressCallback();
   * progressCallback('Einsätze werden importiert', 45.5);
   * // Output: 📈 [█████████░░░░░░░░░░░] 45.5% - Einsätze werden importiert
   * ```
   */
  private createProgressCallback() {
    return (step: string, progress: number) => {
      const progressBar =
        '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
      this.logger.log(`📈 [${progressBar}] ${progress.toFixed(1)}% - ${step}`);
    };
  }

  /**
   * Formatiert Bytes in menschenlesbare Größe.
   *
   * Diese Utility-Methode konvertiert Byte-Werte in eine für Menschen
   * lesbare Form mit entsprechenden Einheiten (Bytes, KB, MB, GB).
   *
   * @param bytes Anzahl der Bytes
   * @returns Formatierte Größenangabe als String
   * @private
   * @example
   * ```typescript
   * this.formatBytes(1024);     // "1 KB"
   * this.formatBytes(1048576);  // "1 MB"
   * this.formatBytes(2560);     // "2.5 KB"
   * ```
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
