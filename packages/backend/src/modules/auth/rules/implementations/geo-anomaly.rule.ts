import { Injectable } from '@nestjs/common';
import { RuleContext, RuleEvaluationResult, GeoBasedRule } from '../rule.interface';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung geografischer Anomalien
 *
 * Diese Regel erkennt unmögliche Reisegeschwindigkeiten und
 * verdächtige geografische Muster in Login-Aktivitäten.
 */
@Injectable()
export class GeoAnomalyRule implements GeoBasedRule {
  id = 'geo-anomaly-detection';
  name = 'Geographic Anomaly Detection';
  description = 'Detects impossible travel speeds and suspicious geographic patterns';
  version = '1.0.0';
  status = RuleStatus.ACTIVE;
  severity = ThreatSeverity.CRITICAL;
  conditionType = ConditionType.GEO_BASED;
  tags = ['geo-location', 'travel-speed', 'authentication'];

  config = {
    maxDistanceKm: 1000, // Maximale Distanz für normale Reisegeschwindigkeit
    checkVelocity: true,
    maxVelocityKmh: 1000, // Maximale Reisegeschwindigkeit (ca. Flugzeuggeschwindigkeit)
    timeWindowMinutes: 60, // Zeitfenster für Velocity-Check
    allowedCountries: [], // Wenn leer, alle Länder erlaubt
    blockedCountries: [], // Explizit blockierte Länder
    suspiciousCountries: ['KP', 'IR', 'SY'], // Länder mit erhöhtem Risiko
  };

  /**
   * Evaluiert die Regel gegen den gegebenen Kontext
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
    if (this.config.suspiciousCountries.includes(currentLocation.country)) {
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
   */
  getDescription(): string {
    return `Detects geographic anomalies including impossible travel speeds (>${this.config.maxVelocityKmh} km/h) and access from blocked/suspicious countries`;
  }

  /**
   * Extrahiert Standortinformationen aus dem Kontext
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
   * In Produktion würde man die Haversine-Formel mit echten Koordinaten verwenden
   */
  private estimateDistance(location1: any, location2: any): number {
    // Vereinfachte Distanzschätzung basierend auf Ländern/Städten
    if (location1.country !== location2.country) {
      // Verschiedene Länder: Mindestens 500km
      return 1500;
    }

    if (location1.city !== location2.city) {
      // Verschiedene Städte im gleichen Land: 100-500km
      return 300;
    }

    return 0;
  }

  /**
   * Berechnet die Schwere basierend auf der Anomalie
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
   */
  private determineSuggestedActions(velocityCheck: any): string[] {
    const actions: string[] = [];

    if (velocityCheck.evidence.velocityKmh > 2000) {
      // Definitiv unmöglich - sofortige Aktion
      actions.push('INVALIDATE_SESSIONS', 'BLOCK_IP');
    } else {
      // Verdächtig aber möglicherweise legitim (VPN, etc.)
      actions.push('REQUIRE_2FA', 'INCREASE_MONITORING');
    }

    return actions;
  }
}
