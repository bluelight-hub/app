import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  RuleContext,
  RuleEvaluationResult,
  ThreatDetectionRule,
  ThreatSeverity,
} from './rule.interface';
import { SecurityAlertService, SecurityAlertType } from '../services/security-alert.service';
import { SecurityLogService } from '../services/security-log.service';
import { SecurityEventType } from '../enums/security-event-type.enum';

/**
 * Service zur Verwaltung und Ausführung von Threat Detection Rules
 */
@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);
  private rules: Map<string, ThreatDetectionRule> = new Map();
  private ruleExecutionStats: Map<
    string,
    {
      executions: number;
      matches: number;
      lastExecution: Date;
      averageExecutionTime: number;
    }
  > = new Map();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly securityAlertService: SecurityAlertService,
    private readonly securityLogService: SecurityLogService,
  ) {}

  /**
   * Registriert eine neue Regel im Engine
   */
  registerRule(rule: ThreatDetectionRule): void {
    if (!rule.validate()) {
      throw new Error(`Invalid rule configuration for rule: ${rule.name}`);
    }

    this.rules.set(rule.id, rule);
    this.logger.log(`Registered threat detection rule: ${rule.name} (${rule.id})`);
  }

  /**
   * Entfernt eine Regel aus dem Engine
   */
  unregisterRule(ruleId: string): void {
    if (this.rules.delete(ruleId)) {
      this.logger.log(`Unregistered threat detection rule: ${ruleId}`);
    }
  }

  /**
   * Holt eine spezifische Regel
   */
  getRule(ruleId: string): ThreatDetectionRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Holt alle registrierten Regeln
   */
  getAllRules(): ThreatDetectionRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Evaluiert alle aktiven Regeln gegen den gegebenen Kontext
   */
  async evaluateRules(context: RuleContext): Promise<RuleEvaluationResult[]> {
    const startTime = Date.now();
    const results: RuleEvaluationResult[] = [];
    const activeRules = Array.from(this.rules.values()).filter((rule) => rule.status === 'ACTIVE');

    this.logger.debug(
      `Evaluating ${activeRules.length} active rules for event: ${context.eventType}`,
    );

    // Parallel evaluation für bessere Performance
    const evaluationPromises = activeRules.map(async (rule) => {
      const ruleStartTime = Date.now();

      try {
        const result = await rule.evaluate(context);

        // Update statistics
        this.updateRuleStats(rule.id, result.matched, Date.now() - ruleStartTime);

        if (result.matched) {
          this.logger.warn(`Rule '${rule.name}' matched with severity: ${result.severity}`);

          // Log security event
          await this.logRuleMatch(rule, context, result);

          // Handle matched rule
          await this.handleMatchedRule(rule, context, result);
        }

        return { rule, result };
      } catch (error) {
        this.logger.error(`Error evaluating rule '${rule.name}': ${error.message}`, error.stack);
        return null;
      }
    });

    const evaluationResults = await Promise.all(evaluationPromises);

    // Filter out errors and collect results
    for (const evalResult of evaluationResults) {
      if (evalResult && evalResult.result.matched) {
        results.push(evalResult.result);
      }
    }

    const executionTime = Date.now() - startTime;
    this.logger.debug(
      `Rule evaluation completed in ${executionTime}ms. Matches: ${results.length}`,
    );

    // Emit event for matched rules
    if (results.length > 0) {
      this.eventEmitter.emit('threat.detected', {
        context,
        results,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * Verarbeitet eine gematchte Regel
   */
  private async handleMatchedRule(
    rule: ThreatDetectionRule,
    context: RuleContext,
    result: RuleEvaluationResult,
  ): Promise<void> {
    // Send security alert based on severity
    if (result.severity === ThreatSeverity.CRITICAL || result.severity === ThreatSeverity.HIGH) {
      await this.sendSecurityAlert(rule, context, result);
    }

    // Execute suggested actions
    if (result.suggestedActions && result.suggestedActions.length > 0) {
      for (const action of result.suggestedActions) {
        await this.executeAction(action, context);
      }
    }
  }

  /**
   * Sendet einen Security Alert für eine gematchte Regel
   */
  private async sendSecurityAlert(
    rule: ThreatDetectionRule,
    context: RuleContext,
    result: RuleEvaluationResult,
  ): Promise<void> {
    const alertType = this.mapRuleToAlertType(rule);

    await this.securityAlertService.sendAlert({
      type: alertType,
      severity: this.mapThreatSeverityToAlertSeverity(result.severity!),
      timestamp: new Date(),
      details: {
        email: context.email,
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        message: `Threat detected: ${rule.name}. ${result.reason}`,
        additionalInfo: {
          ruleName: rule.name,
          ruleId: rule.id,
          score: result.score,
          evidence: result.evidence,
        },
      },
    });
  }

  /**
   * Führt eine vorgeschlagene Aktion aus
   */
  private async executeAction(action: string, context: RuleContext): Promise<void> {
    this.logger.log(`Executing action: ${action}`);

    switch (action) {
      case 'BLOCK_IP':
        this.eventEmitter.emit('security.block.ip', {
          ipAddress: context.ipAddress,
          reason: 'Threat detection rule',
        });
        break;

      case 'REQUIRE_2FA':
        this.eventEmitter.emit('security.require.2fa', {
          userId: context.userId,
          email: context.email,
        });
        break;

      case 'INVALIDATE_SESSIONS':
        this.eventEmitter.emit('security.invalidate.sessions', {
          userId: context.userId,
        });
        break;

      case 'INCREASE_MONITORING':
        this.eventEmitter.emit('security.increase.monitoring', {
          userId: context.userId,
          ipAddress: context.ipAddress,
        });
        break;

      default:
        this.logger.warn(`Unknown action: ${action}`);
    }
  }

  /**
   * Loggt einen Rule Match
   */
  private async logRuleMatch(
    rule: ThreatDetectionRule,
    context: RuleContext,
    result: RuleEvaluationResult,
  ): Promise<void> {
    await this.securityLogService.logSecurityEvent({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        threatDetection: {
          ruleName: rule.name,
          ruleId: rule.id,
          severity: result.severity,
          score: result.score,
          reason: result.reason,
          evidence: result.evidence,
        },
      },
    });
  }

  /**
   * Aktualisiert die Statistiken für eine Regel
   */
  private updateRuleStats(ruleId: string, matched: boolean, executionTime: number): void {
    const currentStats = this.ruleExecutionStats.get(ruleId) || {
      executions: 0,
      matches: 0,
      lastExecution: new Date(),
      averageExecutionTime: 0,
    };

    const newStats = {
      executions: currentStats.executions + 1,
      matches: currentStats.matches + (matched ? 1 : 0),
      lastExecution: new Date(),
      averageExecutionTime:
        (currentStats.averageExecutionTime * currentStats.executions + executionTime) /
        (currentStats.executions + 1),
    };

    this.ruleExecutionStats.set(ruleId, newStats);
  }

  /**
   * Holt die Statistiken für eine Regel
   */
  getRuleStats(ruleId: string) {
    return this.ruleExecutionStats.get(ruleId);
  }

  /**
   * Holt die Statistiken für alle Regeln
   */
  getAllRuleStats() {
    const stats: Record<string, any> = {};
    this.ruleExecutionStats.forEach((value, key) => {
      stats[key] = value;
    });
    return stats;
  }

  /**
   * Mappt Regel-Typ zu Security Alert Type
   */
  private mapRuleToAlertType(rule: ThreatDetectionRule): SecurityAlertType {
    // Map based on rule tags or name
    if (rule.tags.includes('brute-force')) {
      return SecurityAlertType.BRUTE_FORCE_ATTEMPT;
    }
    if (rule.tags.includes('account-lockout')) {
      return SecurityAlertType.ACCOUNT_LOCKED;
    }
    // Default to suspicious login
    return SecurityAlertType.SUSPICIOUS_LOGIN;
  }

  /**
   * Mappt Threat Severity zu Alert Severity
   */
  private mapThreatSeverityToAlertSeverity(
    severity: ThreatSeverity,
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case ThreatSeverity.LOW:
        return 'low';
      case ThreatSeverity.MEDIUM:
        return 'medium';
      case ThreatSeverity.HIGH:
        return 'high';
      case ThreatSeverity.CRITICAL:
        return 'critical';
      default:
        return 'medium';
    }
  }

  /**
   * Lädt Regeln aus der Konfiguration oder Datenbank
   */
  async loadRules(): Promise<void> {
    // This will be implemented when we have the rule repository
    this.logger.log('Loading threat detection rules...');
  }

  /**
   * Gibt Regel-Metriken für Monitoring zurück
   */
  getMetrics() {
    const totalRules = this.rules.size;
    const activeRules = Array.from(this.rules.values()).filter((r) => r.status === 'ACTIVE').length;
    const stats = this.getAllRuleStats();

    let totalExecutions = 0;
    let totalMatches = 0;

    Object.values(stats).forEach((stat: any) => {
      totalExecutions += stat.executions;
      totalMatches += stat.matches;
    });

    return {
      totalRules,
      activeRules,
      totalExecutions,
      totalMatches,
      matchRate: totalExecutions > 0 ? (totalMatches / totalExecutions) * 100 : 0,
      ruleStats: stats,
    };
  }
}
