import { ThreatRulesSeedService } from '@/modules/seed/threat-rules-seed.service';
import { Injectable, Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';

/**
 * Optionen für den Seed-Threat-Rules-Befehl.
 */
interface SeedThreatRulesOptions {
  /**
   * Setzt alle Regeln auf den Standard zurück.
   * ACHTUNG: Überschreibt alle benutzerdefinierten Anpassungen!
   */
  reset?: boolean;

  /**
   * Führt einen Trockenlauf durch ohne Änderungen zu speichern.
   */
  dryRun?: boolean;

  /**
   * Sicherheits-Preset zu verwenden (minimal, standard, maximum, development).
   * Standard: standard
   */
  preset?: string;

  /**
   * Aktiviert alle geseedeten Regeln sofort.
   * Standard: true
   */
  activate?: boolean;

  /**
   * Überspringt bestehende Regeln.
   * Standard: true
   */
  skipExisting?: boolean;
}

/**
 * CLI-Befehl zum Seeden der Threat Detection Rules.
 *
 * Verwendung:
 * - npm run cli -- seed:threat-rules
 * - npm run cli -- seed:threat-rules --preset=maximum
 * - npm run cli -- seed:threat-rules --reset
 * - npm run cli -- seed:threat-rules --dry-run
 */
@Injectable()
@Command({
  name: 'seed:threat-rules',
  description: 'Befüllt die Datenbank mit Standard-Threat-Detection-Rules',
})
export class SeedThreatRulesCommand extends CommandRunner {
  private readonly logger = new Logger(SeedThreatRulesCommand.name);

  constructor(private readonly threatRulesSeedService: ThreatRulesSeedService) {
    super();
  }

  /**
   * Führt den Befehl aus.
   */
  async run(_passedParams: string[], options?: SeedThreatRulesOptions): Promise<void> {
    try {
      this.logger.log('🔐 Starte Threat Detection Rules Seeding...');

      // Validiere Preset
      const validPresets = ['minimal', 'standard', 'maximum', 'development'];
      const preset = options?.preset || 'standard';

      if (!validPresets.includes(preset)) {
        this.logger.error(`❌ Ungültiges Preset: ${preset}. Verfügbar: ${validPresets.join(', ')}`);
        return;
      }

      // Zeige Konfiguration
      this.logger.log('📋 Konfiguration:');
      this.logger.log(`   Preset: ${preset}`);
      this.logger.log(`   Reset: ${options?.reset ? 'Ja' : 'Nein'}`);
      this.logger.log(`   Dry-Run: ${options?.dryRun ? 'Ja' : 'Nein'}`);
      this.logger.log(`   Aktivieren: ${options?.activate !== false ? 'Ja' : 'Nein'}`);
      this.logger.log(
        `   Bestehende überspringen: ${options?.skipExisting !== false ? 'Ja' : 'Nein'}`,
      );
      this.logger.log('');

      if (options?.reset) {
        this.logger.warn('⚠️  WARNUNG: Reset-Modus aktiviert!');
        this.logger.warn('   Alle benutzerdefinierten Regelanpassungen werden überschrieben.');

        if (!options?.dryRun) {
          // In einer echten Anwendung würde man hier eine Bestätigung abfragen
          this.logger.warn('   Fahre in 3 Sekunden fort...');
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      // Führe Seeding aus
      const result = await this.threatRulesSeedService.seedThreatDetectionRules({
        preset: preset as any,
        reset: options?.reset || false,
        dryRun: options?.dryRun || false,
        activate: options?.activate !== false,
        skipExisting: options?.skipExisting !== false,
      });

      if (options?.dryRun) {
        this.logger.log('');
        this.logger.log('🔍 Dry-Run Ergebnisse:');
        this.logger.log(`   Würden importiert: ${result.wouldImport}`);
        this.logger.log(`   Würden aktualisiert: ${result.wouldUpdate}`);
        this.logger.log(`   Würden übersprungen: ${result.wouldSkip}`);
        this.logger.log('');
        this.logger.log('ℹ️  Keine Änderungen wurden vorgenommen (Dry-Run Modus)');
      } else {
        this.logger.log('');
        this.logger.log('✅ Threat Detection Rules erfolgreich geseeded!');
        this.logger.log('');
        this.logger.log('📊 Ergebnisse:');
        this.logger.log(`   Importiert: ${result.imported}`);
        this.logger.log(`   Aktualisiert: ${result.updated}`);
        this.logger.log(`   Übersprungen: ${result.skipped}`);
        this.logger.log(`   Fehler: ${result.errors}`);

        if (result.imported > 0 || result.updated > 0) {
          this.logger.log('');
          this.logger.log('🎯 Geseedete Regeln:');
          result.rules?.forEach((rule: any) => {
            this.logger.log(`   - ${rule.name} (${rule.severity}) [${rule.status}]`);
          });
        }

        this.logger.log('');
        this.logger.log('💡 Hinweise:');
        this.logger.log('   - Regeln können über die API oder UI angepasst werden');
        this.logger.log(
          '   - Verwende --preset=minimal für eine weniger restriktive Konfiguration',
        );
        this.logger.log('   - Verwende --preset=maximum für maximale Sicherheit');
        this.logger.log('   - Die Regeln werden beim nächsten Login evaluiert');
      }
    } catch (error) {
      this.logger.error(`❌ Fehler beim Seeding: ${error.message}`, error.stack);
    }
  }

  /**
   * Parser für die Reset-Option.
   */
  @Option({
    flags: '-r, --reset',
    description: 'Setzt alle Regeln auf Standard zurück (überschreibt Anpassungen)',
  })
  parseReset(): boolean {
    return true;
  }

  /**
   * Parser für die Dry-Run-Option.
   */
  @Option({
    flags: '-d, --dry-run',
    description: 'Zeigt was passieren würde ohne Änderungen vorzunehmen',
  })
  parseDryRun(): boolean {
    return true;
  }

  /**
   * Parser für die Preset-Option.
   */
  @Option({
    flags: '-p, --preset [preset]',
    description: 'Sicherheits-Preset (minimal, standard, maximum, development)',
    defaultValue: 'standard',
  })
  parsePreset(val: string): string {
    return val;
  }

  /**
   * Parser für die Activate-Option.
   */
  @Option({
    flags: '--no-activate',
    description: 'Erstellt Regeln im inaktiven Status',
  })
  parseNoActivate(): boolean {
    return false;
  }

  /**
   * Parser für die Skip-Existing-Option.
   */
  @Option({
    flags: '--update-existing',
    description: 'Aktualisiert bestehende Regeln anstatt sie zu überspringen',
  })
  parseUpdateExisting(): boolean {
    return false;
  }
}
