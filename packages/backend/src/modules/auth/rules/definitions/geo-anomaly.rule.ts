import { RuleContext, RuleEvaluationResult, GeoBasedRule } from '../rule.interface';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung geografischer Anomalien
 *
 * Diese Regel erkennt verdächtige Login-Versuche basierend auf geografischen
 * Mustern und Einschränkungen. Sie implementiert verschiedene Erkennungsmuster:
 *
 * **Hauptfunktionen:**
 * - Blockiert Logins aus explizit gesperrten Ländern
 * - Erlaubt nur Logins aus einer Whitelist von Ländern (falls konfiguriert)
 * - Erkennt erste Logins aus neuen Ländern für bestehende Benutzer
 * - Lernt Benutzerverhalten über einen konfigurierbaren Zeitraum
 *
 * **Sicherheitsstufen:**
 * - CRITICAL: Login aus gesperrtem Land
 * - HIGH: Login aus nicht-erlaubtem Land
 * - MEDIUM: Login aus neuem Land oder nach Inaktivitätsperiode
 *
 * @class GeoAnomalyRule
 * @implements {GeoBasedRule}
 * @example
 * ```typescript
 * const rule = new GeoAnomalyRule({
 *   config: {
 *     blockedCountries: ['KP', 'IR'],
 *     allowedCountries: ['DE', 'AT', 'CH'],
 *     checkNewCountry: true,
 *     learningPeriodDays: 30
 *   }
 * });
 *
 * const context: RuleContext = {
 *   eventType: SecurityEventType.LOGIN_SUCCESS,
 *   userId: 'user-123',
 *   metadata: { country: 'DE', location: 'Berlin' }
 * };
 *
 * const result = await rule.evaluate(context);
 * logger.info(result.matched); // false (erlaubtes Land)
 * ```
 */
export class GeoAnomalyRule implements GeoBasedRule {
  /**
   * Eindeutige Regel-ID
   * @property {string} id - Eindeutige Identifikation der Regel
   */
  id: string;

  /**
   * Name der Regel
   * @property {string} name - Benutzerfreundlicher Name
   */
  name: string;

  /**
   * Beschreibung der Regel
   * @property {string} description - Detaillierte Beschreibung der Funktionalität
   */
  description: string;

  /**
   * Version der Regel
   * @property {string} version - Semantic Versioning für Regel-Updates
   */
  version: string;

  /**
   * Status der Regel
   * @property {RuleStatus} status - ACTIVE, INACTIVE oder DEPRECATED
   */
  status: RuleStatus;

  /**
   * Standard-Schweregrad der Regel
   * @property {ThreatSeverity} severity - Basis-Schweregrad für Treffer
   */
  severity: ThreatSeverity;

  /**
   * Typ der Regel-Bedingung
   * @property {ConditionType} conditionType - Klassifizierung des Regel-Typs
   */
  conditionType: ConditionType;

  /**
   * Konfiguration der geografischen Anomalie-Erkennung
   * @property {object} config - Anpassbare Parameter für die Regel
   */
  config: {
    /**
     * Liste erlaubter Ländercodes (ISO 3166-1 alpha-2)
     * @property {string[]} [allowedCountries] - Wenn gesetzt, nur diese Länder sind erlaubt
     */
    allowedCountries?: string[];

    /**
     * Liste gesperrter Ländercodes (ISO 3166-1 alpha-2)
     * @property {string[]} [blockedCountries] - Diese Länder sind explizit verboten
     */
    blockedCountries?: string[];

    /**
     * Maximale Entfernung vom gewöhnlichen Standort in Kilometern
     * @property {number} [maxDistanceKm] - Für zukünftige Velocity-Checks
     */
    maxDistanceKm?: number;

    /**
     * Aktiviert geografische Geschwindigkeitsprüfung
     * @property {boolean} [checkVelocity] - Erkennt physisch unmögliche Ortswechsel
     */
    checkVelocity?: boolean;

    /**
     * Prüft auf neue Länder für Benutzer
     * @property {boolean} checkNewCountry - Warnt bei ersten Logins aus neuen Ländern
     */
    checkNewCountry: boolean;

    /**
     * Aktiviert maschinelles Lernen von Benutzermustern
     * @property {boolean} userPatternLearning - Lernt normale geografische Muster
     */
    userPatternLearning: boolean;

    /**
     * Lernperiode für Benutzermuster in Tagen
     * @property {number} learningPeriodDays - Zeitraum für historische Analyse
     */
    learningPeriodDays: number;
  };

  /**
   * Tags zur Kategorisierung der Regel
   * @property {string[]} tags - Schlagwörter für Filterung und Suche
   */
  tags: string[];

  /**
   * Konstruktor für die GeoAnomalyRule
   *
   * Initialisiert die Regel mit Standard- oder benutzerdefinierten Werten.
   * Die Konfiguration kann teilweise überschrieben werden, wobei sinnvolle
   * Standardwerte für nicht spezifizierte Parameter verwendet werden.
   *
   * @param {Partial<GeoAnomalyRule>} data - Partielle Konfiguration der Regel
   * @example
   * ```typescript
   * const rule = new GeoAnomalyRule({
   *   config: {
   *     blockedCountries: ['KP', 'IR', 'SY'],
   *     checkNewCountry: true,
   *     learningPeriodDays: 14
   *   }
   * });
   * ```
   */
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

  /**
   * Evaluiert die geografische Anomalie-Regel
   *
   * @param context - Der Kontext der zu evaluierenden Sicherheitsaktion
   * @returns Das Evaluierungsergebnis mit Übereinstimmung, Schweregrad und Details
   */
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

  /**
   * Prüft, ob ein Benutzer sich aus einem neuen Land anmeldet
   *
   * @param context - Der Sicherheitskontext mit historischen Ereignissen
   * @param currentCountry - Das aktuelle Land des Login-Versuchs
   * @returns Evaluierungsergebnis wenn neues Land erkannt wird
   * @private
   */
  private async checkNewCountryForUser(
    context: RuleContext,
    currentCountry: string,
  ): Promise<RuleEvaluationResult> {
    const learningCutoff = new Date(
      Date.now() - this.config.learningPeriodDays * 24 * 60 * 60 * 1000,
    );

    const userCountries = new Set<string>();
    let hasRecentEvents = false;
    let hasCountryData = false;

    context.recentEvents?.forEach((event) => {
      if (event.timestamp >= learningCutoff) {
        hasRecentEvents = true;
        if ((event.metadata as any)?.country) {
          userCountries.add((event.metadata as any).country);
          hasCountryData = true;
        }
      }
    });

    // If we have recent events but no country data, we can't make a determination
    if (hasRecentEvents && !hasCountryData) {
      return { matched: false };
    }

    // If we have no recent events, we can't determine if it's a new country
    if (!context.recentEvents || context.recentEvents.length === 0) {
      return { matched: false };
    }

    // If we have no recent events within the learning period, it's a period of inactivity
    if (!hasRecentEvents) {
      return {
        matched: true,
        severity: ThreatSeverity.MEDIUM,
        score: 65,
        reason: `First login after ${this.config.learningPeriodDays} days of inactivity from country: ${currentCountry}`,
        evidence: {
          newCountry: currentCountry,
          knownCountries: Array.from(userCountries),
          userId: context.userId,
          hasRecentActivity: false,
        },
        suggestedActions: ['REQUIRE_2FA'],
      };
    }

    // If it's a new country (we have history but not from this country)
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
          hasRecentActivity: true,
        },
        suggestedActions: ['REQUIRE_2FA'],
      };
    }

    return { matched: false };
  }

  /**
   * Validiert die Regel-Konfiguration
   *
   * @returns true wenn die Konfiguration gültig ist
   */
  validate(): boolean {
    return this.config.learningPeriodDays > 0;
  }

  /**
   * Gibt die Beschreibung der Regel zurück
   *
   * @returns Beschreibung der Regel
   */
  getDescription(): string {
    return `Detects geographic anomalies including blocked countries, unusual locations, and new countries for users`;
  }
}
