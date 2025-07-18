import {
  RuleContext,
  RuleEvaluationResult,
  GeoBasedRule,
  ThreatSeverity,
  RuleStatus,
  ConditionType,
} from '../rule.interface';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung geografischer Anomalien
 *
 * Diese Regel erkennt:
 * - Logins aus gesperrten Ländern
 * - Logins außerhalb erlaubter Länder
 * - Ungewöhnliche geografische Muster für einen Benutzer
 */
export class GeoAnomalyRule implements GeoBasedRule {
  id: string;
  name: string;
  description: string;
  version: string;
  status: RuleStatus;
  severity: ThreatSeverity;
  conditionType: ConditionType;
  config: {
    allowedCountries?: string[];
    blockedCountries?: string[];
    maxDistanceKm?: number;
    checkVelocity?: boolean;
    checkNewCountry: boolean;
    userPatternLearning: boolean;
    learningPeriodDays: number;
  };
  tags: string[];

  constructor(data: Partial<GeoAnomalyRule>) {
    this.id = data.id || 'geo-anomaly-default';
    this.name = data.name || 'Geographic Anomaly Detection';
    this.description =
      data.description || 'Detects logins from unusual or restricted geographic locations';
    this.version = data.version || '1.0.0';
    this.status = data.status || RuleStatus.ACTIVE;
    this.severity = data.severity || ThreatSeverity.HIGH;
    this.conditionType = ConditionType.GEO_BASED;
    this.tags = data.tags || ['geo-anomaly', 'location', 'authentication'];

    this.config = {
      blockedCountries: ['KP', 'IR'], // Example: North Korea, Iran
      allowedCountries: undefined, // If defined, only these countries are allowed
      maxDistanceKm: 5000, // Max distance from usual location
      checkVelocity: true,
      checkNewCountry: true,
      userPatternLearning: true,
      learningPeriodDays: 30,
      ...data.config,
    };
  }

  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    if (context.eventType !== SecurityEventType.LOGIN_SUCCESS) {
      return { matched: false };
    }

    const location = (context.metadata as any)?.location;
    const country = (context.metadata as any)?.country;

    if (!location || !country) {
      return { matched: false };
    }

    // Check blocked countries
    if (this.config.blockedCountries?.includes(country)) {
      return {
        matched: true,
        severity: ThreatSeverity.CRITICAL,
        score: 100,
        reason: `Login attempt from blocked country: ${country}`,
        evidence: { country, blockedCountries: this.config.blockedCountries },
        suggestedActions: ['BLOCK_IP', 'INVALIDATE_SESSIONS'],
      };
    }

    // Check allowed countries
    if (this.config.allowedCountries && !this.config.allowedCountries.includes(country)) {
      return {
        matched: true,
        severity: ThreatSeverity.HIGH,
        score: 85,
        reason: `Login attempt from non-allowed country: ${country}`,
        evidence: { country, allowedCountries: this.config.allowedCountries },
        suggestedActions: ['REQUIRE_2FA', 'INCREASE_MONITORING'],
      };
    }

    // Check for new country for user
    if (this.config.checkNewCountry && context.userId && context.recentEvents) {
      const isNewCountry = await this.checkNewCountryForUser(context, country);
      if (isNewCountry.matched) return isNewCountry;
    }

    return { matched: false };
  }

  private async checkNewCountryForUser(
    context: RuleContext,
    currentCountry: string,
  ): Promise<RuleEvaluationResult> {
    const learningCutoff = new Date(
      Date.now() - this.config.learningPeriodDays * 24 * 60 * 60 * 1000,
    );

    const userCountries = new Set<string>();
    context.recentEvents?.forEach((event) => {
      if (event.timestamp >= learningCutoff && (event.metadata as any)?.country) {
        userCountries.add((event.metadata as any).country);
      }
    });

    if (userCountries.size > 0 && !userCountries.has(currentCountry)) {
      return {
        matched: true,
        severity: ThreatSeverity.MEDIUM,
        score: 65,
        reason: `First login from new country: ${currentCountry}`,
        evidence: {
          newCountry: currentCountry,
          knownCountries: Array.from(userCountries),
          userId: context.userId,
        },
        suggestedActions: ['REQUIRE_2FA'],
      };
    }

    return { matched: false };
  }

  validate(): boolean {
    return this.config.learningPeriodDays > 0;
  }

  getDescription(): string {
    return `Detects geographic anomalies including blocked countries, unusual locations, and new countries for users`;
  }
}
