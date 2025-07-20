import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { getRulesForPreset } from '@/modules/auth/constants';
import { RuleStatus } from '@prisma/generated/prisma/enums';

/**
 * Minimaler Service für das Seeding von Threat Detection Rules
 *
 * Dieser Service ist speziell für CLI-Commands optimiert und hat
 * keine komplexen Dependencies.
 */
@Injectable()
export class ThreatRulesSeedService {
  private readonly logger = new Logger(ThreatRulesSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seedet Threat Detection Rules basierend auf dem gewählten Preset
   */
  async seedThreatDetectionRules(options: {
    preset: 'minimal' | 'standard' | 'maximum' | 'development';
    reset?: boolean;
    dryRun?: boolean;
    activate?: boolean;
    skipExisting?: boolean;
  }): Promise<{
    imported?: number;
    updated?: number;
    skipped?: number;
    errors?: number;
    wouldImport?: number;
    wouldUpdate?: number;
    wouldSkip?: number;
    rules?: any[];
  }> {
    this.logger.log(`Seeding Threat Detection Rules mit Preset: ${options.preset}`);

    // Hole Regeln für das gewählte Preset
    const rulesToSeed = getRulesForPreset(options.preset);

    if (options.dryRun) {
      // Dry-Run: Nur analysieren was passieren würde
      const result = {
        wouldImport: 0,
        wouldUpdate: 0,
        wouldSkip: 0,
        rules: [] as any[],
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

    // Echtes Seeding
    try {
      // Bei Reset erst alle Regeln löschen
      if (options.reset) {
        this.logger.warn('Reset-Modus: Lösche alle bestehenden Threat Detection Rules...');
        await this.prisma.threatDetectionRule.deleteMany();
        this.logger.log('Alle Regeln gelöscht');
      }

      // Bereite Regeln für Import vor
      const preparedRules = rulesToSeed.map((rule) => ({
        ...rule,
        status: options.activate !== false ? RuleStatus.ACTIVE : RuleStatus.INACTIVE,
      }));

      // Importiere Regeln
      const result = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        rules: [] as any[],
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
    } catch (error) {
      this.logger.error('Fehler beim Seeding der Threat Detection Rules:', error);
      throw error;
    }
  }
}
