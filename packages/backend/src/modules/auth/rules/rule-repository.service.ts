import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ThreatDetectionRule } from './rule.interface';
import { ConditionType, RuleStatus, ThreatSeverity } from '@prisma/generated/prisma/enums';
import { RuleEngineService } from './rule-engine.service';
import type { ThreatDetectionRuleModel } from '@prisma/generated/prisma/models/ThreatDetectionRule';

/**
 * Service zur Verwaltung der Threat Detection Rules in der Datenbank
 */
@Injectable()
export class RuleRepositoryService implements OnModuleInit {
  private readonly logger = new Logger(RuleRepositoryService.name);
  private readonly enableHotReload: boolean;
  private ruleCache: Map<string, ThreatDetectionRule> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ruleEngineService: RuleEngineService,
  ) {
    this.enableHotReload = this.configService.get<boolean>('THREAT_RULES_HOT_RELOAD', false);
  }

  /**
   * Initialisiert das Modul und lädt alle Regeln
   */
  async onModuleInit() {
    await this.loadAllRules();

    if (this.enableHotReload) {
      this.startRuleReloadInterval();
    }
  }

  /**
   * Lädt alle aktiven Regeln aus der Datenbank
   */
  async loadAllRules(): Promise<void> {
    try {
      this.logger.log('Loading threat detection rules from database...');

      const dbRules = await this.prisma.threatDetectionRule.findMany({
        where: {
          status: {
            in: ['ACTIVE', 'TESTING'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Clear existing rules in engine
      const existingRules = this.ruleEngineService.getAllRules();
      existingRules.forEach((rule) => {
        this.ruleEngineService.unregisterRule(rule.id);
      });

      // Load new rules
      for (const dbRule of dbRules) {
        try {
          const rule = await this.createRuleFromDbRecord(dbRule);
          if (rule) {
            this.ruleEngineService.registerRule(rule);
            this.ruleCache.set(rule.id, rule);
          }
        } catch (error) {
          this.logger.error(`Failed to load rule ${dbRule.id}: ${error.message}`);
        }
      }

      this.logger.log(`Loaded ${dbRules.length} threat detection rules`);
    } catch (error) {
      this.logger.error('Failed to load threat detection rules', error);
    }
  }

  /**
   * Erstellt eine neue Regel
   */
  async createRule(data: {
    name: string;
    description: string;
    severity: ThreatSeverity;
    conditionType: ConditionType;
    config: Record<string, any>;
    tags: string[];
  }): Promise<string> {
    const rule = await this.prisma.threatDetectionRule.create({
      data: {
        name: data.name,
        description: data.description,
        version: '1.0.0',
        status: RuleStatus.TESTING,
        severity: data.severity,
        conditionType: data.conditionType,
        config: data.config,
        tags: data.tags,
      },
    });

    // Load rule into engine if testing
    if (rule.status === RuleStatus.TESTING) {
      const ruleInstance = await this.createRuleFromDbRecord(rule);
      if (ruleInstance) {
        this.ruleEngineService.registerRule(ruleInstance);
        this.ruleCache.set(ruleInstance.id, ruleInstance);
      }
    }

    return rule.id;
  }

  /**
   * Aktualisiert eine bestehende Regel
   */
  async updateRule(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      status: RuleStatus;
      severity: ThreatSeverity;
      config: Record<string, any>;
      tags: string[];
    }>,
  ): Promise<void> {
    const updatedRule = await this.prisma.threatDetectionRule.update({
      where: { id },
      data: {
        ...data,
        version: data.config ? this.incrementVersion(await this.getRule(id)) : undefined,
        updatedAt: new Date(),
      },
    });

    // Reload rule in engine
    this.ruleEngineService.unregisterRule(id);

    if (updatedRule.status === RuleStatus.ACTIVE || updatedRule.status === RuleStatus.TESTING) {
      const ruleInstance = await this.createRuleFromDbRecord(updatedRule);
      if (ruleInstance) {
        this.ruleEngineService.registerRule(ruleInstance);
        this.ruleCache.set(ruleInstance.id, ruleInstance);
      }
    } else {
      this.ruleCache.delete(id);
    }
  }

  /**
   * Löscht eine Regel
   */
  async deleteRule(id: string): Promise<void> {
    await this.prisma.threatDetectionRule.delete({
      where: { id },
    });

    this.ruleEngineService.unregisterRule(id);
    this.ruleCache.delete(id);
  }

  /**
   * Holt eine spezifische Regel
   */
  async getRule(id: string): Promise<ThreatDetectionRuleModel | null> {
    return this.prisma.threatDetectionRule.findUnique({
      where: { id },
    });
  }

  /**
   * Holt alle Regeln mit optionalen Filtern
   */
  async getRules(filters?: {
    status?: RuleStatus;
    severity?: ThreatSeverity;
    tags?: string[];
  }): Promise<ThreatDetectionRuleModel[]> {
    return this.prisma.threatDetectionRule.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.severity && { severity: filters.severity }),
        ...(filters?.tags && {
          tags: {
            hasSome: filters.tags,
          },
        }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Holt Regel-Statistiken
   */
  async getRuleStatistics(): Promise<{
    totalRules: number;
    rulesByStatus: {
      active: number;
      inactive: number;
      testing: number;
    };
    rulesBySeverity: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    engineMetrics: any; // Dies bleibt any, da es von RuleEngineService.getMetrics() kommt
  }> {
    const rules = await this.prisma.threatDetectionRule.findMany();
    const engineMetrics = this.ruleEngineService.getMetrics();

    return {
      totalRules: rules.length,
      rulesByStatus: {
        active: rules.filter((r) => r.status === RuleStatus.ACTIVE).length,
        inactive: rules.filter((r) => r.status === RuleStatus.INACTIVE).length,
        testing: rules.filter((r) => r.status === RuleStatus.TESTING).length,
      },
      rulesBySeverity: {
        low: rules.filter((r) => r.severity === ThreatSeverity.LOW).length,
        medium: rules.filter((r) => r.severity === ThreatSeverity.MEDIUM).length,
        high: rules.filter((r) => r.severity === ThreatSeverity.HIGH).length,
        critical: rules.filter((r) => r.severity === ThreatSeverity.CRITICAL).length,
      },
      engineMetrics,
    };
  }

  /**
   * Erstellt eine Regel-Instanz aus einem Datenbank-Record
   */
  private async createRuleFromDbRecord(
    dbRule: ThreatDetectionRuleModel,
  ): Promise<ThreatDetectionRule | null> {
    try {
      const RuleClass = await this.getRuleClass(dbRule.conditionType);
      if (!RuleClass) {
        this.logger.warn(`No rule class found for condition type: ${dbRule.conditionType}`);
        return null;
      }

      const rule = new RuleClass({
        id: dbRule.id,
        name: dbRule.name,
        description: dbRule.description,
        version: dbRule.version,
        status: dbRule.status as RuleStatus,
        severity: dbRule.severity as ThreatSeverity,
        conditionType: dbRule.conditionType as ConditionType,
        config: dbRule.config as Record<string, any>,
        tags: dbRule.tags as string[],
      });

      if (!rule.validate()) {
        this.logger.warn(`Rule validation failed for: ${dbRule.name}`);
        return null;
      }

      return rule;
    } catch (error) {
      this.logger.error(`Failed to create rule instance: ${error.message}`);
      return null;
    }
  }

  /**
   * Holt die entsprechende Regel-Klasse basierend auf dem Condition Type
   */
  private async getRuleClass(
    conditionType: ConditionType,
  ): Promise<new (config: any) => ThreatDetectionRule | null> {
    // Dynamisches Laden der Regel-Klassen
    switch (conditionType) {
      case ConditionType.THRESHOLD: {
        const { BruteForceRule } = await import('./definitions/brute-force.rule');
        return BruteForceRule;
      }

      case ConditionType.PATTERN: {
        const { IpHoppingRule } = await import('./definitions/ip-hopping.rule');
        return IpHoppingRule;
      }

      case ConditionType.TIME_BASED: {
        const { TimeAnomalyRule } = await import('./definitions/time-anomaly.rule');
        return TimeAnomalyRule;
      }

      case ConditionType.GEO_BASED: {
        const { GeoAnomalyRule } = await import('./definitions/geo-anomaly.rule');
        return GeoAnomalyRule;
      }

      default:
        return null;
    }
  }

  /**
   * Erhöht die Versionsnummer
   */
  private incrementVersion(rule: ThreatDetectionRuleModel | null): string {
    if (!rule?.version) return '1.0.0';

    const parts = rule.version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  /**
   * Startet das Hot-Reload-Intervall für Regeln
   */
  private startRuleReloadInterval(): void {
    const reloadInterval = this.configService.get<number>('THREAT_RULES_RELOAD_INTERVAL', 60000); // 1 minute default

    setInterval(async () => {
      try {
        await this.checkForRuleUpdates();
      } catch (error) {
        this.logger.error('Failed to check for rule updates', error);
      }
    }, reloadInterval);

    this.logger.log(`Rule hot reload enabled with interval: ${reloadInterval}ms`);
  }

  /**
   * Überprüft auf Regel-Updates
   */
  private async checkForRuleUpdates(): Promise<void> {
    const dbRules = await this.prisma.threatDetectionRule.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'TESTING'],
        },
      },
    });

    const currentRuleIds = new Set(this.ruleCache.keys());
    const dbRuleIds = new Set(dbRules.map((r) => r.id));

    // Check for new or updated rules
    for (const dbRule of dbRules) {
      const cachedRule = this.ruleCache.get(dbRule.id);

      if (!cachedRule || cachedRule.version !== dbRule.version) {
        this.logger.log(`Reloading rule: ${dbRule.name} (${dbRule.id})`);

        this.ruleEngineService.unregisterRule(dbRule.id);
        const ruleInstance = await this.createRuleFromDbRecord(dbRule);

        if (ruleInstance) {
          this.ruleEngineService.registerRule(ruleInstance);
          this.ruleCache.set(ruleInstance.id, ruleInstance);
        }
      }
    }

    // Remove deleted rules
    for (const ruleId of currentRuleIds) {
      if (!dbRuleIds.has(ruleId)) {
        this.logger.log(`Removing deleted rule: ${ruleId}`);
        this.ruleEngineService.unregisterRule(ruleId);
        this.ruleCache.delete(ruleId);
      }
    }
  }
}
