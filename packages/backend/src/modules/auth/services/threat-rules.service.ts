import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ThreatRuleFactory } from '../rules/rule.factory';
import { RuleEngineService } from '../rules/rule-engine.service';
import { RuleStatus, ThreatSeverity } from '@prisma/generated/prisma/enums';
import { ThreatDetectionRule } from '@prisma/generated/prisma';

/**
 * Service zur Verwaltung von Threat Detection Rules
 *
 * Dieser Service lädt Regeln aus der Datenbank, erstellt Regel-Instanzen
 * und registriert sie im Rule Engine.
 */
@Injectable()
export class ThreatRulesService implements OnModuleInit {
  private readonly logger = new Logger(ThreatRulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleFactory: ThreatRuleFactory,
    private readonly ruleEngine: RuleEngineService,
  ) {}

  /**
   * Initialisiert den Service beim Start
   */
  async onModuleInit() {
    await this.loadAndRegisterRules();
  }

  /**
   * Lädt alle aktiven Regeln aus der Datenbank und registriert sie
   */
  async loadAndRegisterRules(): Promise<void> {
    try {
      this.logger.log('Loading threat detection rules from database...');

      const dbRules = await this.prisma.threatDetectionRule.findMany({
        where: {
          status: {
            in: [RuleStatus.ACTIVE, RuleStatus.TESTING],
          },
        },
        orderBy: {
          severity: 'desc', // Kritische Regeln zuerst
        },
      });

      this.logger.log(`Found ${dbRules.length} rules to load`);

      let successCount = 0;
      let errorCount = 0;

      for (const dbRule of dbRules) {
        try {
          const rule = this.ruleFactory.createFromDatabase(dbRule);
          this.ruleEngine.registerRule(rule);
          successCount++;
          this.logger.debug(`Loaded rule: ${rule.name} (${rule.id})`);
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Failed to load rule ${dbRule.name} (${dbRule.id}): ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(`Rule loading complete. Success: ${successCount}, Errors: ${errorCount}`);
    } catch (error) {
      this.logger.error('Failed to load threat detection rules', error.stack);
    }
  }

  /**
   * Erstellt eine neue Regel in der Datenbank
   */
  async createRule(data: {
    id: string;
    name: string;
    description: string;
    version?: string;
    status?: RuleStatus;
    severity: ThreatSeverity;
    conditionType: string;
    config: any;
    tags?: string[];
    createdBy?: string;
  }): Promise<any> {
    // Validiere die Regel-Konfiguration
    const validation = this.ruleFactory.validateConfig(data.id, data);
    if (!validation.valid) {
      throw new Error(`Invalid rule configuration: ${validation.errors?.join(', ')}`);
    }

    // Erstelle Regel in Datenbank
    const dbRule = await this.prisma.threatDetectionRule.create({
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        version: data.version || '1.0.0',
        status: data.status || RuleStatus.INACTIVE,
        severity: data.severity,
        conditionType: data.conditionType as any,
        config: data.config,
        tags: data.tags || [],
        createdBy: data.createdBy,
      },
    });

    // Wenn aktiv, sofort registrieren
    if (dbRule.status === RuleStatus.ACTIVE) {
      const rule = this.ruleFactory.createFromDatabase(dbRule);
      this.ruleEngine.registerRule(rule);
    }

    return dbRule;
  }

  /**
   * Aktualisiert eine bestehende Regel
   */
  async updateRule(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      version: string;
      status: RuleStatus;
      severity: ThreatSeverity;
      config: any;
      tags: string[];
      updatedBy: string;
    }>,
  ): Promise<any> {
    // Hole aktuelle Regel
    const currentRule = await this.prisma.threatDetectionRule.findUnique({
      where: { id },
    });

    if (!currentRule) {
      throw new Error(`Rule not found: ${id}`);
    }

    // Validiere neue Konfiguration wenn config geändert wird
    if (data.config) {
      const validation = this.ruleFactory.validateConfig(id, {
        ...currentRule,
        ...data,
      });
      if (!validation.valid) {
        throw new Error(`Invalid rule configuration: ${validation.errors?.join(', ')}`);
      }
    }

    // Update in Datenbank
    const updatedRule = await this.prisma.threatDetectionRule.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Re-registriere Regel im Engine
    this.ruleEngine.unregisterRule(id);
    if (updatedRule.status === RuleStatus.ACTIVE || updatedRule.status === RuleStatus.TESTING) {
      const rule = this.ruleFactory.createFromDatabase(updatedRule);
      this.ruleEngine.registerRule(rule);
    }

    return updatedRule;
  }

  /**
   * Löscht eine Regel
   */
  async deleteRule(id: string): Promise<void> {
    // Entferne aus Engine
    this.ruleEngine.unregisterRule(id);

    // Lösche aus Datenbank
    await this.prisma.threatDetectionRule.delete({
      where: { id },
    });
  }

  /**
   * Holt eine Regel aus der Datenbank
   */
  async getRule(id: string): Promise<ThreatDetectionRule | null> {
    return this.prisma.threatDetectionRule.findUnique({
      where: { id },
    });
  }

  /**
   * Holt alle Regeln
   */
  async getAllRules(filter?: {
    status?: RuleStatus;
    severity?: ThreatSeverity;
    tags?: string[];
  }): Promise<any[]> {
    const where: any = {};

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.severity) {
      where.severity = filter.severity;
    }

    if (filter?.tags && filter.tags.length > 0) {
      where.tags = {
        hasSome: filter.tags,
      };
    }

    return this.prisma.threatDetectionRule.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // Aktive zuerst
        { severity: 'desc' }, // Dann nach Severity
        { name: 'asc' }, // Dann alphabetisch
      ],
    });
  }

  /**
   * Aktiviert eine Regel
   */
  async activateRule(id: string): Promise<void> {
    await this.updateRule(id, { status: RuleStatus.ACTIVE });
  }

  /**
   * Deaktiviert eine Regel
   */
  async deactivateRule(id: string): Promise<void> {
    await this.updateRule(id, { status: RuleStatus.INACTIVE });
  }

  /**
   * Setzt eine Regel in Test-Modus
   */
  async setRuleToTesting(id: string): Promise<void> {
    await this.updateRule(id, { status: RuleStatus.TESTING });
  }

  /**
   * Holt Regel-Evaluierungs-Historie
   */
  async getRuleEvaluationHistory(
    ruleId: string,
    options?: {
      limit?: number;
      matched?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<any[]> {
    const where: any = { ruleId };

    if (options?.matched !== undefined) {
      where.matched = options.matched;
    }

    if (options?.startDate || options?.endDate) {
      where.evaluatedAt = {};
      if (options.startDate) {
        where.evaluatedAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.evaluatedAt.lte = options.endDate;
      }
    }

    return this.prisma.ruleEvaluation.findMany({
      where,
      orderBy: { evaluatedAt: 'desc' },
      take: options?.limit || 100,
      include: {
        rule: {
          select: {
            name: true,
            severity: true,
          },
        },
      },
    });
  }

  /**
   * Batch-Import von Regeln (für Seeding)
   */
  async batchImportRules(
    rules: Array<{
      id: string;
      name: string;
      description: string;
      version?: string;
      status?: RuleStatus;
      severity: ThreatSeverity;
      conditionType: string;
      config: any;
      tags?: string[];
    }>,
    options?: {
      skipExisting?: boolean;
      updateExisting?: boolean;
    },
  ): Promise<{ imported: number; skipped: number; updated: number; errors: number }> {
    const stats = {
      imported: 0,
      skipped: 0,
      updated: 0,
      errors: 0,
    };

    for (const ruleData of rules) {
      try {
        const existing = await this.getRule(ruleData.id);

        if (existing) {
          if (options?.skipExisting) {
            stats.skipped++;
            this.logger.debug(`Skipped existing rule: ${ruleData.id}`);
            continue;
          } else if (options?.updateExisting) {
            await this.updateRule(ruleData.id, ruleData);
            stats.updated++;
            this.logger.debug(`Updated existing rule: ${ruleData.id}`);
            continue;
          } else {
            stats.skipped++;
            this.logger.debug(`Rule already exists: ${ruleData.id}`);
            continue;
          }
        }

        await this.createRule(ruleData);
        stats.imported++;
        this.logger.debug(`Imported new rule: ${ruleData.id}`);
      } catch (error) {
        stats.errors++;
        this.logger.error(`Failed to import rule ${ruleData.id}: ${error.message}`);
      }
    }

    this.logger.log(
      `Batch import complete. Imported: ${stats.imported}, Updated: ${stats.updated}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`,
    );

    return stats;
  }

  /**
   * Reload alle Regeln (z.B. nach Änderungen)
   */
  async reloadRules(): Promise<void> {
    // Entferne alle Regeln aus Engine
    const currentRules = this.ruleEngine.getAllRules();
    for (const rule of currentRules) {
      this.ruleEngine.unregisterRule(rule.id);
    }

    // Lade neu
    await this.loadAndRegisterRules();
  }
}
