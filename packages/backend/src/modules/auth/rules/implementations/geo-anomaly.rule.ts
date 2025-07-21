import { Injectable } from '@nestjs/common';
import { GeoBasedRule, RuleContext, RuleEvaluationResult } from '../rule.interface';
import { ConditionType, RuleStatus, ThreatSeverity } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung geografischer Anomalien
 *
 * Diese Regel erkennt unmögliche Reisegeschwindigkeiten und
 * verdächtige geografische Muster in Login-Aktivitäten.
 *
 * Features:
 * - Erkennung unmöglicher Reisegeschwindigkeiten
 * - Länderspezifische Zugriffskontrolle (erlaubt/blockiert)
 * - Erkennung von Logins aus verdächtigen Ländern
 * - Berechnung von Distanzen zwischen Login-Standorten
 * - Flexible Konfiguration von Schwellenwerten
 *
 * @class GeoAnomalyRule
 * @implements {GeoBasedRule}
 * @injectable
 *
 * @example
 * ```typescript
 * const rule = new GeoAnomalyRule();
 * const result = await rule.evaluate({
 *   eventType: SecurityEventType.LOGIN_SUCCESS,
 *   userId: 'user123',
 *   timestamp: new Date(),
 *   metadata: {
 *     location: 'Tokyo, Japan'
 *   },
 *   recentEvents: [
 *     {
 *       eventType: SecurityEventType.LOGIN_SUCCESS,
 *       timestamp: new Date(Date.now() - 3600000), // 1 Stunde zuvor
 *       metadata: { location: 'Berlin, Germany' }
 *     }
 *   ]
 * });
 *
 * if (result.matched) {
 *   // Unmögliche Reisegeschwindigkeit erkannt!
 *   logger.log(result.reason); // "Impossible travel speed detected: 8900 km/h..."
 * }
 * ```
 */
@Injectable()
export class GeoAnomalyRule implements GeoBasedRule {
  /**
   * Eindeutige Regel-ID
   * @property {string} id - Eindeutige Identifikation für geografische Anomalie-Erkennung
   */
  id = 'geo-anomaly-detection';

  /**
   * Name der Regel
   * @property {string} name - Benutzerfreundlicher Name der Regel
   */
  name = 'Geographic Anomaly Detection';

  /**
   * Beschreibung der Regel
   * @property {string} description - Detaillierte Beschreibung der Funktionalität
   */
  description = 'Detects impossible travel speeds and suspicious geographic patterns';

  /**
   * Version der Regel
   * @property {string} version - Semantic Versioning für Regel-Updates
   */
  version = '1.0.0';

  /**
   * Status der Regel
   * @property {RuleStatus} status - ACTIVE, INACTIVE oder DEPRECATED
   */
  status = RuleStatus.ACTIVE;

  /**
   * Standard-Schweregrad der Regel
   * @property {ThreatSeverity} severity - Basis-Schweregrad für Treffer
   */
  severity = ThreatSeverity.CRITICAL;

  /**
   * Typ der Regel-Bedingung
   * @property {ConditionType} conditionType - Klassifizierung als geografisch-basierte Regel
   */
  conditionType = ConditionType.GEO_BASED;

  /**
   * Tags zur Kategorisierung der Regel
   * @property {string[]} tags - Schlagwörter für Filterung und Gruppierung
   */
  tags = ['geo-location', 'travel-speed', 'authentication'];

  /**
   * Konfiguration der geografischen Anomalie-Erkennung
   * @property {object} config - Anpassbare Parameter für Velocity-Checks und Länder-Beschränkungen
   */
  config = {
    /**
     * Maximale normale Reisedistanz in Kilometern
     * @property {number} maxDistanceKm - Schwellenwert für normale Reiseentfernungen
     */
    maxDistanceKm: 1000,

    /**
     * Aktiviert Geschwindigkeitsprüfung
     * @property {boolean} checkVelocity - Prüft auf unmögliche Reisegeschwindigkeiten
     */
    checkVelocity: true,

    /**
     * Maximale realistische Reisegeschwindigkeit in km/h
     * @property {number} maxVelocityKmh - Schwellenwert für physisch mögliche Geschwindigkeit
     */
    maxVelocityKmh: 1000,

    /**
     * Zeitfenster für Velocity-Check in Minuten
     * @property {number} timeWindowMinutes - Wie weit zurück nach vorherigen Logins gesucht wird
     */
    timeWindowMinutes: 60,

    /**
     * Liste erlaubter Länder (leer = alle erlaubt)
     * @property {string[]} allowedCountries - Whitelist von Ländercodes
     */
    allowedCountries: [],

    /**
     * Liste explizit blockierter Länder
     * @property {string[]} blockedCountries - Blacklist von Ländercodes
     */
    blockedCountries: [],

    /**
     * Länder mit erhöhtem Risiko
     * @property {string[]} suspiciousCountries - Länder die zusätzliche Überwachung auslösen
     */
    suspiciousCountries: ['KP', 'IR', 'SY'],
  };

  /**
   * Evaluiert die Regel gegen den gegebenen Kontext
   *
   * Prüft auf geografische Anomalien wie unmögliche Reisegeschwindigkeiten,
   * blockierte Länder und verdächtige Standorte. Die Evaluierung erfolgt
   * in folgender Reihenfolge:
   * 1. Länderrestriktionen (blockiert/erlaubt)
   * 2. Geschwindigkeitsprüfung (Velocity Check)
   * 3. Verdächtige Länder
   *
   * @param {RuleContext} context - Der Evaluierungskontext mit Standortdaten
   * @returns {Promise<RuleEvaluationResult>} Evaluierungsergebnis
   *
   * @example
   * ```typescript
   * // Blockiertes Land
   * const result = await rule.evaluate({
   *   eventType: SecurityEventType.LOGIN_SUCCESS,
   *   metadata: { location: 'Pyongyang, KP' }
   * });
   * // result.matched: true, severity: CRITICAL
   *
   * // Unmögliche Geschwindigkeit
   * const result = await rule.evaluate({
   *   metadata: { location: 'Sydney, Australia' },
   *   recentEvents: [{
   *     timestamp: new Date(Date.now() - 3600000), // 1h zuvor
   *     metadata: { location: 'Berlin, Germany' }
   *   }]
   * });
   * // result.matched: true, reason: "Impossible travel speed detected: 16000 km/h..."
   * ```
   */
  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    // Nur bei erfolgreichen Logins evaluieren
    if (context.eventType !== SecurityEventType.LOGIN_SUCCESS) {
      return { matched: false };
    }

    // Benötigt Standortinformationen
    const currentLocation = this.extractLocation(context);
    if (!currentLocation) {
      return { matched: false };
    }

    // Prüfe blockierte/erlaubte Länder
    const countryCheck = this.checkCountryRestrictions(currentLocation.country);
    if (countryCheck.blocked) {
      return {
        matched: true,
        severity: ThreatSeverity.CRITICAL,
        score: 100,
        reason: countryCheck.reason,
        evidence: {
          country: currentLocation.country,
          blockedCountries: this.config.blockedCountries,
        },
        suggestedActions: ['BLOCK_IP', 'INVALIDATE_SESSIONS'],
      };
    }

    // Prüfe Velocity (unmögliche Reisegeschwindigkeit)
    if (this.config.checkVelocity && context.recentEvents) {
      const velocityCheck = this.checkVelocity(currentLocation, context);
      if (velocityCheck.anomalyDetected) {
        return {
          matched: true,
          severity: this.calculateSeverity(velocityCheck),
          score: this.calculateScore(velocityCheck),
          reason: velocityCheck.reason,
          evidence: velocityCheck.evidence,
          suggestedActions: this.determineSuggestedActions(velocityCheck),
        };
      }
    }

    // Prüfe verdächtige Länder
    const countryCode = this.getCountryCode(currentLocation.country);
    if (this.config.suspiciousCountries.includes(countryCode)) {
      return {
        matched: true,
        severity: ThreatSeverity.MEDIUM,
        score: 60,
        reason: `Login from suspicious country: ${currentLocation.country}`,
        evidence: {
          country: currentLocation.country,
          city: currentLocation.city,
        },
        suggestedActions: ['REQUIRE_2FA', 'INCREASE_MONITORING'],
      };
    }

    return { matched: false };
  }

  /**
   * Validiert die Regel-Konfiguration
   *
   * Stellt sicher, dass alle erforderlichen Konfigurationsparameter
   * vorhanden und gültig sind.
   *
   * @returns {boolean} true wenn die Konfiguration gültig ist
   *
   * @example
   * ```typescript
   * if (!rule.validate()) {
   *   throw new Error('Invalid geo anomaly rule configuration');
   * }
   * ```
   */
  validate(): boolean {
    return (
      this.config.maxDistanceKm > 0 &&
      this.config.maxVelocityKmh > 0 &&
      this.config.timeWindowMinutes > 0
    );
  }

  /**
   * Gibt eine menschenlesbare Beschreibung der Regel zurück
   *
   * Erstellt eine Beschreibung basierend auf der aktuellen Konfiguration
   * mit den relevanten Schwellenwerten.
   *
   * @returns {string} Beschreibung der Regel
   *
   * @example
   * ```typescript
   * logger.log(rule.getDescription());
   * // "Detects geographic anomalies including impossible travel speeds (>1000 km/h) and access from blocked/suspicious countries"
   * ```
   */
  getDescription(): string {
    return `Detects geographic anomalies including impossible travel speeds (>${this.config.maxVelocityKmh} km/h) and access from blocked/suspicious countries`;
  }

  /**
   * Extrahiert Standortinformationen aus dem Kontext
   *
   * Versucht Standortdaten aus den Metadaten zu extrahieren.
   * In einer Produktionsumgebung würde hier ein GeoIP-Lookup
   * basierend auf der IP-Adresse durchgeführt werden.
   *
   * @private
   * @param {RuleContext} context - Der Evaluierungskontext
   * @returns {any} Strukturierte Standortdaten oder null
   *
   * @example
   * ```typescript
   * const location = this.extractLocation({
   *   metadata: { location: 'Berlin, Germany' }
   * });
   * // { city: 'Berlin', country: 'Germany', raw: 'Berlin, Germany' }
   * ```
   */
  private extractLocation(context: RuleContext): any {
    // Versuche Location aus Metadaten zu extrahieren
    if (context.metadata?.location) {
      return this.parseLocation(context.metadata.location);
    }

    // Fallback: Nur IP verfügbar (würde normalerweise GeoIP lookup benötigen)
    return null;
  }

  /**
   * Parst Location-String in strukturierte Daten
   *
   * Konvertiert einen Standort-String im Format "City, Country"
   * oder "City, Region, Country" in ein strukturiertes Objekt.
   *
   * @private
   * @param {string} location - Der zu parsende Standort-String
   * @returns {any} Strukturiertes Standortobjekt oder null
   *
   * @example
   * ```typescript
   * const loc1 = this.parseLocation('Tokyo, Japan');
   * // { city: 'Tokyo', country: 'Japan', raw: 'Tokyo, Japan' }
   *
   * const loc2 = this.parseLocation('San Francisco, California, United States');
   * // { city: 'San Francisco', region: 'California', country: 'United States', raw: '...' }
   * ```
   */
  private parseLocation(location: string): any {
    // Erwartetes Format: "City, Country" oder "City, Region, Country"
    const parts = location.split(',').map((p) => p.trim());

    if (parts.length >= 2) {
      return {
        city: parts[0],
        country: parts[parts.length - 1],
        region: parts.length > 2 ? parts[1] : undefined,
        raw: location,
      };
    }

    return null;
  }

  /**
   * Prüft Länderbeschränkungen
   *
   * Überprüft ob das Land auf der Blockliste steht oder
   * nicht in der Erlaubnisliste enthalten ist (falls definiert).
   *
   * @private
   * @param {string} country - Der zu prüfende Ländername
   * @returns {Object} Prüfergebnis mit blocked-Flag und Begründung
   *
   * @example
   * ```typescript
   * // Mit blockedCountries: ['North Korea', 'Iran']
   * const check = this.checkCountryRestrictions('North Korea');
   * // { blocked: true, reason: 'Access from blocked country: North Korea' }
   *
   * // Mit allowedCountries: ['Germany', 'France']
   * const check = this.checkCountryRestrictions('Spain');
   * // { blocked: true, reason: 'Access from non-allowed country: Spain' }
   * ```
   */
  private checkCountryRestrictions(country: string): any {
    if (this.config.blockedCountries.includes(country)) {
      return {
        blocked: true,
        reason: `Access from blocked country: ${country}`,
      };
    }

    if (
      this.config.allowedCountries.length > 0 &&
      !this.config.allowedCountries.includes(country)
    ) {
      return {
        blocked: true,
        reason: `Access from non-allowed country: ${country}`,
      };
    }

    return { blocked: false };
  }

  /**
   * Prüft auf unmögliche Reisegeschwindigkeiten
   *
   * Berechnet die Geschwindigkeit zwischen dem aktuellen und
   * vorherigen Login-Standorten. Erkennt physikalisch unmögliche
   * Reisegeschwindigkeiten als Indikator für kompromittierte Accounts.
   *
   * @private
   * @param {any} currentLocation - Aktueller Standort
   * @param {RuleContext} context - Evaluierungskontext mit historischen Events
   * @returns {Object} Prüfergebnis mit Details zur erkannten Anomalie
   *
   * @example
   * ```typescript
   * const check = this.checkVelocity(
   *   { city: 'Tokyo', country: 'Japan' },
   *   {
   *     timestamp: new Date(),
   *     recentEvents: [{
   *       timestamp: new Date(Date.now() - 3600000), // 1h zuvor
   *       metadata: { location: 'Berlin, Germany' }
   *     }]
   *   }
   * );
   * // {
   * //   anomalyDetected: true,
   * //   reason: 'Impossible travel speed detected: 8900 km/h...',
   * //   evidence: { velocityKmh: 8900, distanceKm: 8900, ... }
   * // }
   * ```
   */
  private checkVelocity(currentLocation: any, context: RuleContext): any {
    const cutoffTime = new Date(
      context.timestamp.getTime() - this.config.timeWindowMinutes * 60 * 1000,
    );

    // Finde letzte erfolgreiche Logins mit anderen Standorten
    const previousLogins =
      context.recentEvents?.filter((event) => {
        return (
          event.eventType === SecurityEventType.LOGIN_SUCCESS &&
          event.timestamp >= cutoffTime &&
          event.metadata?.location &&
          event.metadata.location !== currentLocation.raw
        );
      }) || [];

    for (const prevLogin of previousLogins) {
      const prevLocation = this.parseLocation(prevLogin.metadata.location);
      if (!prevLocation) continue;

      // Berechne Distanz (vereinfachte Berechnung, würde normalerweise Haversine-Formel verwenden)
      const distance = this.estimateDistance(prevLocation, currentLocation);
      const timeDiffHours =
        (context.timestamp.getTime() - prevLogin.timestamp.getTime()) / (1000 * 60 * 60);

      if (timeDiffHours > 0) {
        const velocity = distance / timeDiffHours;

        if (velocity > this.config.maxVelocityKmh) {
          return {
            anomalyDetected: true,
            reason: `Impossible travel speed detected: ${Math.round(velocity)} km/h between ${prevLocation.city} and ${currentLocation.city}`,
            evidence: {
              previousLocation: prevLocation,
              currentLocation: currentLocation,
              distanceKm: Math.round(distance),
              timeDiffMinutes: Math.round(timeDiffHours * 60),
              velocityKmh: Math.round(velocity),
              maxAllowedVelocityKmh: this.config.maxVelocityKmh,
            },
            severity: velocity > 2000 ? 'CRITICAL' : 'HIGH', // Über 2000 km/h ist definitiv unmöglich
          };
        }
      }
    }

    return { anomalyDetected: false };
  }

  /**
   * Schätzt die Distanz zwischen zwei Standorten (vereinfacht)
   *
   * Verwendet eine vordefinierte Distanztabelle für gängige
   * Länderkombinationen. In einer Produktionsumgebung würde
   * die Haversine-Formel mit echten GPS-Koordinaten verwendet.
   *
   * @private
   * @param {any} location1 - Erster Standort
   * @param {any} location2 - Zweiter Standort
   * @returns {number} Geschätzte Distanz in Kilometern
   *
   * @example
   * ```typescript
   * const dist1 = this.estimateDistance(
   *   { city: 'Berlin', country: 'Germany' },
   *   { city: 'Tokyo', country: 'Japan' }
   * );
   * // 8900 (km)
   *
   * const dist2 = this.estimateDistance(
   *   { city: 'Berlin', country: 'Germany' },
   *   { city: 'Munich', country: 'Germany' }
   * );
   * // 300 (km - Standardwert für Städte im gleichen Land)
   * ```
   */
  private estimateDistance(location1: any, location2: any): number {
    // Vereinfachte Distanzschätzung basierend auf Ländern/Städten
    const distanceMap: Record<string, Record<string, number>> = {
      Germany: {
        Japan: 8900, // Berlin - Tokyo
        Australia: 16000, // Berlin - Sydney
        'United States': 6400, // Berlin - New York
        France: 880, // Berlin - Paris
      },
      Japan: {
        Germany: 8900, // Tokyo - Berlin
        Australia: 7800, // Tokyo - Sydney
        'United States': 10800, // Tokyo - New York
      },
      'United States': {
        Australia: 14400, // New York - Sydney
        Germany: 6400, // New York - Berlin
        Japan: 10800, // New York - Tokyo
      },
      Australia: {
        'United States': 14400, // Sydney - New York
        Germany: 16000, // Sydney - Berlin
        Japan: 7800, // Sydney - Tokyo
      },
    };

    if (location1.country !== location2.country) {
      // Versuche Distanz aus Tabelle zu ermitteln
      const distance =
        distanceMap[location1.country]?.[location2.country] ||
        distanceMap[location2.country]?.[location1.country] ||
        1500; // Standard für unbekannte Länder
      return distance;
    }

    if (location1.city !== location2.city) {
      // Verschiedene Städte im gleichen Land: 100-500km
      return 300;
    }

    return 0;
  }

  /**
   * Berechnet die Schwere basierend auf der Anomalie
   *
   * Bestimmt den Schweregrad der Bedrohung anhand der
   * erkannten Reisegeschwindigkeit. Je höher die unmögliche
   * Geschwindigkeit, desto kritischer die Bewertung.
   *
   * @private
   * @param {any} velocityCheck - Ergebnis der Geschwindigkeitsprüfung
   * @returns {ThreatSeverity} Berechneter Schweregrad
   *
   * @example
   * ```typescript
   * // Bei extrem hoher Geschwindigkeit
   * const severity = this.calculateSeverity({
   *   evidence: { velocityKmh: 2500 }
   * });
   * // ThreatSeverity.CRITICAL
   *
   * // Bei hoher Geschwindigkeit
   * const severity = this.calculateSeverity({
   *   evidence: { velocityKmh: 1700 }
   * });
   * // ThreatSeverity.HIGH
   * ```
   */
  private calculateSeverity(velocityCheck: any): ThreatSeverity {
    if (velocityCheck.evidence.velocityKmh > 2000) {
      return ThreatSeverity.CRITICAL;
    }

    if (velocityCheck.evidence.velocityKmh > 1500) {
      return ThreatSeverity.HIGH;
    }

    return ThreatSeverity.MEDIUM;
  }

  /**
   * Berechnet einen Risiko-Score (0-100)
   *
   * Generiert einen numerischen Score basierend auf der
   * Überschreitung der erlaubten Maximalgeschwindigkeit.
   * Je höher die Überschreitung, desto höher der Score.
   *
   * @private
   * @param {any} velocityCheck - Ergebnis der Geschwindigkeitsprüfung
   * @returns {number} Risiko-Score zwischen 0 und 100
   *
   * @example
   * ```typescript
   * const score = this.calculateScore({
   *   evidence: { velocityKmh: 1500 }
   * });
   * // Bei maxVelocityKmh=1000: score = 75 (50 + 500/20)
   * ```
   */
  private calculateScore(velocityCheck: any): number {
    const velocity = velocityCheck.evidence.velocityKmh;

    // Score basierend auf Überschreitung der normalen Geschwindigkeit
    const excessVelocity = velocity - this.config.maxVelocityKmh;
    const score = Math.min(50 + excessVelocity / 20, 100);

    return Math.round(score);
  }

  /**
   * Bestimmt die vorgeschlagenen Aktionen
   *
   * Empfiehlt Sicherheitsmaßnahmen basierend auf der
   * erkannten Reisegeschwindigkeit. Je unmöglicher die
   * Geschwindigkeit, desto drastischer die Maßnahmen.
   *
   * @private
   * @param {any} velocityCheck - Ergebnis der Geschwindigkeitsprüfung
   * @returns {string[]} Array empfohlener Sicherheitsaktionen
   *
   * @example
   * ```typescript
   * // Bei extrem hoher Geschwindigkeit
   * const actions = this.determineSuggestedActions({
   *   evidence: { velocityKmh: 2500 }
   * });
   * // ['INVALIDATE_SESSIONS', 'BLOCK_IP']
   *
   * // Bei verdächtiger Geschwindigkeit
   * const actions = this.determineSuggestedActions({
   *   evidence: { velocityKmh: 800 }
   * });
   * // ['REQUIRE_2FA']
   * ```
   */
  private determineSuggestedActions(velocityCheck: any): string[] {
    const actions: string[] = [];

    if (velocityCheck.evidence.velocityKmh > 2000) {
      // Definitiv unmöglich - sofortige Aktion
      actions.push('INVALIDATE_SESSIONS', 'BLOCK_IP');
    } else if (velocityCheck.evidence.velocityKmh > 1000) {
      // Sehr verdächtig - erhöhte Sicherheitsmaßnahmen
      actions.push('REQUIRE_2FA', 'INCREASE_MONITORING');
    } else {
      // Verdächtig aber möglicherweise legitim (VPN, etc.)
      actions.push('REQUIRE_2FA');
    }

    return actions;
  }

  /**
   * Konvertiert Ländernamen zu ISO-Code
   *
   * Mappt gängige Ländernamen auf ihre ISO-3166-1 Alpha-2 Codes.
   * Wird für die Überprüfung gegen die suspiciousCountries-Liste
   * verwendet.
   *
   * @private
   * @param {string} country - Der Ländername
   * @returns {string} ISO-Ländercode oder Original-String
   *
   * @example
   * ```typescript
   * const code1 = this.getCountryCode('Germany');
   * // 'DE'
   *
   * const code2 = this.getCountryCode('North Korea');
   * // 'KP'
   *
   * const code3 = this.getCountryCode('Unknown Country');
   * // 'Unknown Country' (kein Mapping vorhanden)
   * ```
   */
  private getCountryCode(country: string): string {
    // Mapping der häufigsten Länder zu ISO-Codes
    const countryMap: Record<string, string> = {
      Iran: 'IR',
      'North Korea': 'KP',
      Syria: 'SY',
      Germany: 'DE',
      France: 'FR',
      'United Kingdom': 'GB',
      'United States': 'US',
      Japan: 'JP',
      Australia: 'AU',
      // Weitere können bei Bedarf hinzugefügt werden
    };

    return countryMap[country] || country;
  }
}
