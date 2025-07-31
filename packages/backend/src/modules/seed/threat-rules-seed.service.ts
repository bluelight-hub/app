import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { getRulesForPreset } from '@/modules/auth/constants';
import { RuleStatus } from '@prisma/generated/prisma/enums';
import type {
  ThreatDetectionRuleData,
  ThreatDetectionRuleDataWithAction,
  ThreatRuleSeedResult,
  ThreatRuleSeedOptions,
} from '@/modules/auth/interfaces/threat-rule.interface';

/**
 * Service für das Seeding von Threat Detection Rules
 *
 * Dieser Service ist speziell für CLI-Commands optimiert und hat
 * keine komplexen Dependencies. Er ermöglicht das Importieren,
 * Aktualisieren und Zurücksetzen von Sicherheitsregeln für die
 * Bedrohungserkennung.
 *
 * Der Service unterstützt verschiedene Presets mit vordefinierten
 * Regelsammlungen und bietet Optionen für Dry-Run, Überspringen
 * existierender Regeln und komplettes Zurücksetzen.
 *
 * @class ThreatRulesSeedService
 * @injectable
 *
 * @example
 * ```typescript
 * // Standard-Regeln importieren
 * const result = await seedService.seedThreatDetectionRules({
 *   preset: 'standard',
 *   activate: true,
 *   skipExisting: true
 * });
 *
 * // Dry-Run durchführen
 * const dryResult = await seedService.seedThreatDetectionRules({
 *   preset: 'strict',
 *   dryRun: true
 * });
 * ```
 */
@Injectable()
export class ThreatRulesSeedService {
  /**
   * Logger-Instanz für Service-Meldungen
   * @private
   * @property {Logger} logger
   */
  private readonly logger = new Logger(ThreatRulesSeedService.name);

  /**
   * Konstruktor des ThreatRulesSeedService
   *
   * @param {PrismaService} prisma - Prisma Service für Datenbankzugriff
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Importiert Threat Detection Rules basierend auf den gewählten Optionen
   *
   * Diese Methode verarbeitet die Regeln aus dem gewählten Preset und
   * führt je nach Optionen verschiedene Aktionen durch:
   * - Import neuer Regeln
   * - Aktualisierung existierender Regeln
   * - Überspringen bereits vorhandener Regeln
   * - Komplettes Zurücksetzen und Neuimport
   *
   * @param {ThreatRuleSeedOptions} options - Konfigurationsoptionen für den Import
   * @param {string} options.preset - Name des Regel-Presets ('standard', 'strict', 'minimal')
   * @param {boolean} [options.activate=true] - Aktiviert importierte Regeln automatisch
   * @param {boolean} [options.skipExisting=true] - Überspringt existierende Regeln
   * @param {boolean} [options.reset=false] - Löscht alle Regeln vor dem Import
   * @param {boolean} [options.dryRun=false] - Simuliert den Import ohne Änderungen
   *
   * @returns {Promise<ThreatRuleSeedResult>} Ergebnis des Seed-Vorgangs
   * @returns {number} result.imported - Anzahl neu importierter Regeln
   * @returns {number} result.updated - Anzahl aktualisierter Regeln
   * @returns {number} result.skipped - Anzahl übersprungener Regeln
   * @returns {number} result.errors - Anzahl aufgetretener Fehler
   * @returns {ThreatDetectionRuleData[]} result.rules - Verarbeitete Regeln
   *
   * @throws {Error} Bei Datenbankfehlern oder ungültigen Presets
   *
   * @example
   * ```typescript
   * // Standard-Import mit Aktivierung
   * const result = await seedService.seedThreatDetectionRules({
   *   preset: 'standard',
   *   activate: true,
   *   skipExisting: true
   * });
   * logger.info(`Importiert: ${result.imported}, Übersprungen: ${result.skipped}`);
   *
   * // Reset und Neuimport
   * const resetResult = await seedService.seedThreatDetectionRules({
   *   preset: 'strict',
   *   reset: true,
   *   activate: true
   * });
   * logger.info(`Alle Regeln zurückgesetzt und ${resetResult.imported} neu importiert`);
   * ```
   */
  async seedThreatDetectionRules(options: ThreatRuleSeedOptions): Promise<ThreatRuleSeedResult> {
    this.logger.log(`Seeding Threat Detection Rules mit Preset: ${options.preset}`);

    // Hole Regeln für das gewählte Preset
    const rulesToSeed = getRulesForPreset(options.preset);

    if (options.dryRun) {
      return await this.performDryRun(rulesToSeed, options);
    }

    return await this.performActualSeeding(rulesToSeed, options);
  }

  /**
   * Führt einen Dry-Run durch ohne Datenbankänderungen
   *
   * Analysiert, welche Aktionen bei einem echten Import durchgeführt
   * würden, ohne tatsächliche Änderungen vorzunehmen.
   *
   * @private
   * @param {ThreatDetectionRuleData[]} rulesToSeed - Zu importierende Regeln
   * @param {ThreatRuleSeedOptions} options - Import-Optionen
   * @returns {Promise<ThreatRuleSeedResult>} Simulationsergebnis
   *
   * @example
   * ```typescript
   * const result = await this.performDryRun(rules, {
   *   preset: 'standard',
   *   skipExisting: true,
   *   dryRun: true
   * });
   * // result: { wouldImport: 5, wouldUpdate: 3, wouldSkip: 7, rules: [...] }
   * ```
   */
  private async performDryRun(
    rulesToSeed: ThreatDetectionRuleData[],
    options: ThreatRuleSeedOptions,
  ): Promise<ThreatRuleSeedResult> {
    const result = {
      wouldImport: 0,
      wouldUpdate: 0,
      wouldSkip: 0,
      rules: [] as ThreatDetectionRuleDataWithAction[],
    };

    for (const ruleData of rulesToSeed) {
      const existing = await this.prisma.threatDetectionRule.findUnique({
        where: { id: ruleData.id },
      });

      if (existing) {
        if (options.reset || !options.skipExisting) {
          result.wouldUpdate++;
        } else {
          result.wouldSkip++;
        }
      } else {
        result.wouldImport++;
      }

      result.rules.push({
        ...ruleData,
        wouldBe: existing
          ? options.reset || !options.skipExisting
            ? 'updated'
            : 'skipped'
          : 'imported',
      });
    }

    return result;
  }

  /**
   * Führt das tatsächliche Seeding der Regeln durch
   *
   * Importiert, aktualisiert oder überspringt Regeln basierend auf
   * den Optionen und schreibt Änderungen in die Datenbank.
   *
   * @private
   * @param {ThreatDetectionRuleData[]} rulesToSeed - Zu importierende Regeln
   * @param {ThreatRuleSeedOptions} options - Import-Optionen
   * @returns {Promise<ThreatRuleSeedResult>} Import-Ergebnis
   * @throws {Error} Bei Datenbankfehlern
   *
   * @example
   * ```typescript
   * const result = await this.performActualSeeding(rules, {
   *   preset: 'standard',
   *   activate: true,
   *   skipExisting: false
   * });
   * // result: { imported: 5, updated: 3, skipped: 0, errors: 0, rules: [...] }
   * ```
   */
  private async performActualSeeding(
    rulesToSeed: ThreatDetectionRuleData[],
    options: ThreatRuleSeedOptions,
  ): Promise<ThreatRuleSeedResult> {
    try {
      // Bei Reset erst alle Regeln löschen
      if (options.reset) {
        await this.resetAllRules();
      }

      // Bereite Regeln für Import vor
      const preparedRules = this.prepareRulesForImport(rulesToSeed, options);

      // Importiere Regeln
      return await this.importRules(preparedRules, options);
    } catch (error) {
      this.logger.error('Fehler beim Seeding der Threat Detection Rules:', error);
      throw error;
    }
  }

  /**
   * Löscht alle existierenden Threat Detection Rules
   *
   * Wird beim Reset-Modus verwendet, um eine saubere Basis für
   * den Neuimport zu schaffen.
   *
   * @private
   * @returns {Promise<void>} Promise ohne Rückgabewert
   *
   * @example
   * ```typescript
   * await this.resetAllRules();
   * // Alle Threat Detection Rules wurden aus der Datenbank gelöscht
   * ```
   */
  private async resetAllRules(): Promise<void> {
    this.logger.warn('Reset-Modus: Lösche alle bestehenden Threat Detection Rules...');
    await this.prisma.threatDetectionRule.deleteMany();
    this.logger.log('Alle Regeln gelöscht');
  }

  /**
   * Bereitet Regeln für den Import vor
   *
   * Fügt den Regeln den korrekten Status hinzu basierend auf den
   * Import-Optionen.
   *
   * @private
   * @param {ThreatDetectionRuleData[]} rules - Ursprüngliche Regeln
   * @param {ThreatRuleSeedOptions} options - Import-Optionen
   * @returns {ThreatDetectionRuleData[]} Vorbereitete Regeln mit Status
   *
   * @example
   * ```typescript
   * const prepared = this.prepareRulesForImport(rules, { activate: true });
   * // Alle Regeln haben jetzt status: RuleStatus.ACTIVE
   * ```
   */
  private prepareRulesForImport(
    rules: ThreatDetectionRuleData[],
    options: ThreatRuleSeedOptions,
  ): ThreatDetectionRuleData[] {
    return rules.map((rule) => ({
      ...rule,
      status: options.activate !== false ? RuleStatus.ACTIVE : RuleStatus.INACTIVE,
    }));
  }

  /**
   * Importiert einzelne Regeln in die Datenbank
   *
   * Verarbeitet jede Regel einzeln und entscheidet basierend auf
   * ihrer Existenz und den Optionen, ob sie importiert, aktualisiert
   * oder übersprungen wird.
   *
   * @private
   * @param {ThreatDetectionRuleData[]} preparedRules - Vorbereitete Regeln
   * @param {ThreatRuleSeedOptions} options - Import-Optionen
   * @returns {Promise<ThreatRuleSeedResult>} Detailliertes Import-Ergebnis
   *
   * @example
   * ```typescript
   * const result = await this.importRules(preparedRules, {
   *   skipExisting: true
   * });
   * // Neue Regeln importiert, existierende übersprungen
   * ```
   */
  private async importRules(
    preparedRules: ThreatDetectionRuleData[],
    options: ThreatRuleSeedOptions,
  ): Promise<ThreatRuleSeedResult> {
    const result = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      rules: [] as ThreatDetectionRuleData[],
    };

    for (const ruleData of preparedRules) {
      try {
        const existing = await this.prisma.threatDetectionRule.findUnique({
          where: { id: ruleData.id },
        });

        if (existing) {
          if (options.skipExisting !== false) {
            result.skipped++;
            continue;
          }

          await this.prisma.threatDetectionRule.update({
            where: { id: ruleData.id },
            data: ruleData,
          });
          result.updated++;
        } else {
          await this.prisma.threatDetectionRule.create({
            data: ruleData,
          });
          result.imported++;
        }

        result.rules.push(ruleData);
      } catch (error) {
        this.logger.error(`Fehler beim Importieren der Regel ${ruleData.id}:`, error);
        result.errors++;
      }
    }

    return result;
  }
}
