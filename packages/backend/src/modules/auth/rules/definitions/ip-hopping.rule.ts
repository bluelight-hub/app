import { RuleContext, RuleEvaluationResult, PatternRule } from '../rule.interface';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { SecurityEventType } from '../../enums/security-event-type.enum';

/**
 * Regel zur Erkennung von IP-Hopping-Mustern
 *
 * Diese Regel erkennt verdächtige Muster, wenn ein Benutzer:
 * - Sich von mehreren IP-Adressen in kurzer Zeit anmeldet
 * - IP-Adressen in geografisch unmöglichen Distanzen wechselt
 * - Typische Proxy/VPN-Hopping-Muster zeigt
 *
 * Die Regel implementiert drei Haupterkennungsmuster:
 * 1. **Rapid IP Change**: Erkennt schnelle Wechsel zwischen verschiedenen IP-Adressen
 * 2. **Geo-Impossible Travel**: Identifiziert physisch unmögliche Ortswechsel
 * 3. **Proxy Pattern**: Erkennt typische VPN/Proxy-Nutzungsmuster
 *
 * @example
 * ```typescript
 * const rule = new IpHoppingRule({
 *   config: {
 *     maxIpsThreshold: 5,
 *     lookbackMinutes: 60,
 *     maxVelocityKmPerHour: 1500
 *   }
 * });
 * const result = await rule.evaluate(context);
 * if (result.matched) {
 *   logger.warn(`IP-Hopping erkannt: ${result.reason}`);
 * }
 * ```
 */
export class IpHoppingRule implements PatternRule {
  /** Eindeutige Regel-ID */
  id: string;

  /** Menschenlesbarer Name der Regel */
  name: string;

  /** Detaillierte Beschreibung der Regel-Funktionalität */
  description: string;

  /** Versionsnummer der Regel-Implementierung */
  version: string;

  /** Aktueller Status der Regel (ACTIVE, INACTIVE, etc.) */
  status: RuleStatus;

  /** Schweregrad bei positivem Match */
  severity: ThreatSeverity;

  /** Typ der Regel-Bedingung */
  conditionType: ConditionType;

  /** Konfiguration der IP-Hopping-Erkennungsparameter */
  config: {
    /** Liste der zu prüfenden Pattern-Typen */
    patterns: string[];
    /** Verknüpfung der Pattern ('any' oder 'all') */
    matchType: 'any' | 'all';
    /** Rückblickzeitraum in Minuten */
    lookbackMinutes: number;
    /** Schwellenwert für maximale Anzahl verschiedener IPs */
    maxIpsThreshold: number;
    /** Zeitfenster für verdächtige IP-Wechsel in Minuten */
    suspiciousIpChangeMinutes: number;
    /** VPN/Proxy-Erkennung aktivieren */
    vpnDetection: boolean;
    /** Geografische Geschwindigkeitsprüfung aktivieren */
    geoVelocityCheck: boolean;
    /** Maximale realistische Reisegeschwindigkeit in km/h */
    maxVelocityKmPerHour: number;
  };

  /** Kategorisierungs-Tags für die Regel */
  tags: string[];

  /**
   * Erstellt eine neue IP-Hopping-Regel mit den gegebenen Konfigurationsparametern
   *
   * @param data Partial-Konfiguration der Regel, fehlende Werte werden mit Defaults gefüllt
   */
  constructor(data: Partial<IpHoppingRule>) {
    this.id = data.id || 'ip-hopping-default';
    this.name = data.name || 'IP Hopping Detection';
    this.description =
      data.description || 'Detects suspicious IP address changes and hopping patterns';
    this.version = data.version || '1.0.0';
    this.status = data.status || RuleStatus.ACTIVE;
    this.severity = data.severity || ThreatSeverity.HIGH;
    this.conditionType = ConditionType.PATTERN;
    this.tags = data.tags || ['ip-hopping', 'proxy', 'vpn', 'authentication'];

    // Default configuration
    this.config = {
      patterns: ['rapid-ip-change', 'geo-impossible', 'proxy-pattern'],
      matchType: 'any',
      lookbackMinutes: 30,
      maxIpsThreshold: 3, // More than 3 IPs in time window is suspicious
      suspiciousIpChangeMinutes: 5, // IP change within 5 minutes is suspicious
      vpnDetection: true,
      geoVelocityCheck: true,
      maxVelocityKmPerHour: 1000, // Max realistic travel speed
      ...data.config,
    };
  }

  /**
   * Evaluiert die Regel gegen den gegebenen Kontext
   *
   * Diese Methode prüft den aktuellen Login-Kontext gegen alle konfigurierten
   * IP-Hopping-Muster. Je nach `matchType` wird bei einem Treffer (any) sofort
   * zurückgegeben oder alle Muster müssen zutreffen (all).
   *
   * @param context Der Sicherheitskontext mit Login-Informationen und Historie
   * @returns Evaluierungsergebnis mit Match-Status, Schweregrad und Empfehlungen
   * @example
   * ```typescript
   * const result = await rule.evaluate({
   *   eventType: SecurityEventType.LOGIN_SUCCESS,
   *   userId: 'user123',
   *   ipAddress: '192.168.1.1',
   *   recentEvents: [...],
   *   timestamp: new Date()
   * });
   * ```
   */
  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    // Only check on successful login events
    if (context.eventType !== SecurityEventType.LOGIN_SUCCESS) {
      return { matched: false };
    }

    if (!context.userId || !context.ipAddress || !context.recentEvents) {
      return { matched: false };
    }

    const results: RuleEvaluationResult[] = [];

    // Check each pattern
    for (const pattern of this.config.patterns) {
      let result: RuleEvaluationResult | null = null;

      switch (pattern) {
        case 'rapid-ip-change':
          result = await this.checkRapidIpChange(context);
          break;
        case 'geo-impossible':
          result = await this.checkGeoImpossibleTravel(context);
          break;
        case 'proxy-pattern':
          result = await this.checkProxyPattern(context);
          break;
      }

      if (result && result.matched) {
        results.push(result);

        // If matchType is 'any', we can return early
        if (this.config.matchType === 'any') {
          return result;
        }
      }
    }

    // For matchType 'all', all patterns must match
    if (this.config.matchType === 'all' && results.length === this.config.patterns.length) {
      return this.combineResults(results);
    }

    return { matched: false };
  }

  /**
   * Prüft auf schnelle IP-Wechsel
   *
   * Diese Methode analysiert die Login-Historie eines Benutzers und erkennt
   * verdächtige Muster wie:
   * - Mehr IP-Adressen als der konfigurierte Schwellenwert
   * - Schnelle Wechsel zwischen verschiedenen IPs (innerhalb von Minuten)
   *
   * Der Score wird basierend auf der Anzahl der IPs und der Geschwindigkeit
   * der Wechsel berechnet.
   *
   * @param context Der aktuelle Sicherheitskontext
   * @returns Evaluierungsergebnis mit Details zu erkannten IP-Wechseln
   * @private
   */
  private async checkRapidIpChange(context: RuleContext): Promise<RuleEvaluationResult> {
    const cutoffTime = new Date(Date.now() - this.config.lookbackMinutes * 60 * 1000);

    // Get all successful logins for this user in the time window
    const userLogins = context.recentEvents
      .filter(
        (event) =>
          event.eventType === SecurityEventType.LOGIN_SUCCESS &&
          (event.metadata as any)?.userId === context.userId &&
          event.timestamp >= cutoffTime,
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Collect unique IPs with their timestamps
    const ipMap = new Map<string, Date[]>();
    userLogins.forEach((event) => {
      if (event.ipAddress) {
        const timestamps = ipMap.get(event.ipAddress) || [];
        timestamps.push(event.timestamp);
        ipMap.set(event.ipAddress, timestamps);
      }
    });

    const uniqueIps = ipMap.size;

    // Check if too many IPs
    if (uniqueIps >= this.config.maxIpsThreshold) {
      // Check for rapid changes
      let rapidChanges = 0;
      const ipList = Array.from(ipMap.keys());

      for (let i = 0; i < userLogins.length - 1; i++) {
        const currentIp = userLogins[i].ipAddress;
        const nextIp = userLogins[i + 1].ipAddress;

        if (currentIp !== nextIp) {
          const timeDiff =
            userLogins[i + 1].timestamp.getTime() - userLogins[i].timestamp.getTime();
          if (timeDiff < this.config.suspiciousIpChangeMinutes * 60 * 1000) {
            rapidChanges++;
          }
        }
      }

      const score = Math.min(100, (uniqueIps / 10) * 100 + rapidChanges * 10);

      return {
        matched: true,
        severity: uniqueIps >= 5 ? ThreatSeverity.CRITICAL : ThreatSeverity.HIGH,
        score: Math.round(score),
        reason: `User logged in from ${uniqueIps} different IPs within ${this.config.lookbackMinutes} minutes with ${rapidChanges} rapid IP changes`,
        evidence: {
          userId: context.userId,
          uniqueIps,
          rapidChanges,
          ipAddresses: ipList,
          timeWindow: this.config.lookbackMinutes,
        },
        suggestedActions: ['REQUIRE_2FA', 'INCREASE_MONITORING'],
      };
    }

    return { matched: false };
  }

  /**
   * Prüft auf geografisch unmögliche Reisen
   *
   * Diese Methode berechnet die physische Reisegeschwindigkeit zwischen
   * aufeinanderfolgenden Logins basierend auf den geografischen Koordinaten
   * der IP-Adressen. Eine Geschwindigkeit über dem konfigurierten Maximum
   * (z.B. 1000 km/h) wird als unmöglich eingestuft.
   *
   * Die Distanzberechnung erfolgt mittels der Haversine-Formel für
   * Großkreisentfernungen auf der Erdkugel.
   *
   * @param context Der aktuelle Sicherheitskontext mit Geo-Informationen
   * @returns Evaluierungsergebnis mit Details zu unmöglichen Reisen
   * @private
   */
  private async checkGeoImpossibleTravel(context: RuleContext): Promise<RuleEvaluationResult> {
    if (!this.config.geoVelocityCheck) {
      return { matched: false };
    }

    const cutoffTime = new Date(Date.now() - this.config.lookbackMinutes * 60 * 1000);

    // Get user's login history with locations
    const userLogins = context.recentEvents
      .filter(
        (event) =>
          event.eventType === SecurityEventType.LOGIN_SUCCESS &&
          (event.metadata as any)?.userId === context.userId &&
          event.timestamp >= cutoffTime &&
          event.ipAddress,
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Add current login
    userLogins.push({
      eventType: SecurityEventType.LOGIN_SUCCESS,
      timestamp: context.timestamp,
      ipAddress: context.ipAddress,
      metadata: context.metadata,
    });

    // Check for impossible travel between consecutive logins
    for (let i = 0; i < userLogins.length - 1; i++) {
      const fromLogin = userLogins[i];
      const toLogin = userLogins[i + 1];

      if (fromLogin.ipAddress === toLogin.ipAddress) continue;

      // Get locations from metadata (assuming GeoIP service provides this)
      const fromLocation = (fromLogin.metadata as any)?.location;
      const toLocation = (toLogin.metadata as any)?.location;

      if (fromLocation && toLocation) {
        const distance = this.calculateDistance(fromLocation, toLocation);
        const timeDiffHours =
          (toLogin.timestamp.getTime() - fromLogin.timestamp.getTime()) / (1000 * 60 * 60);
        const velocity = distance / timeDiffHours;

        if (velocity > this.config.maxVelocityKmPerHour) {
          return {
            matched: true,
            severity: ThreatSeverity.CRITICAL,
            score: 95,
            reason: `Impossible travel detected: ${Math.round(distance)}km in ${Math.round(timeDiffHours * 60)} minutes (${Math.round(velocity)}km/h)`,
            evidence: {
              fromIp: fromLogin.ipAddress,
              toIp: toLogin.ipAddress,
              fromLocation,
              toLocation,
              distance: Math.round(distance),
              timeDiffMinutes: Math.round(timeDiffHours * 60),
              velocity: Math.round(velocity),
              maxVelocity: this.config.maxVelocityKmPerHour,
            },
            suggestedActions: ['INVALIDATE_SESSIONS', 'REQUIRE_2FA', 'BLOCK_IP'],
          };
        }
      }
    }

    return { matched: false };
  }

  /**
   * Prüft auf typische Proxy/VPN-Muster
   *
   * Diese Methode erkennt charakteristische Muster von Proxy- und VPN-Nutzung:
   * - Häufige Wechsel zwischen verschiedenen Ländern
   * - Viele verschiedene Autonomous System Numbers (ASNs)
   * - Hoher Anteil von Datacenter-IP-Adressen
   *
   * Ein Score wird basierend auf der Anzahl der Länder, ASNs und dem
   * Datacenter-Verhältnis berechnet.
   *
   * @param context Der aktuelle Sicherheitskontext mit IP-Metadaten
   * @returns Evaluierungsergebnis mit Details zu erkannten Proxy-Mustern
   * @private
   */
  private async checkProxyPattern(context: RuleContext): Promise<RuleEvaluationResult> {
    if (!this.config.vpnDetection) {
      return { matched: false };
    }

    const cutoffTime = new Date(Date.now() - this.config.lookbackMinutes * 60 * 1000);

    // Common proxy/VPN patterns:
    // 1. Sequential IPs from different ASNs
    // 2. IPs from known datacenter ranges
    // 3. Rapid country changes

    const userLogins = context.recentEvents.filter(
      (event) =>
        event.eventType === SecurityEventType.LOGIN_SUCCESS &&
        (event.metadata as any)?.userId === context.userId &&
        event.timestamp >= cutoffTime &&
        event.ipAddress,
    );

    // Count unique countries and ASNs
    const countries = new Set<string>();
    const asns = new Set<string>();
    const datacenterIps = [];

    userLogins.forEach((event) => {
      const metadata = event.metadata as any;
      if (metadata?.country) countries.add(metadata.country);
      if (metadata?.asn) asns.add(metadata.asn);
      if (metadata?.isDatacenter) datacenterIps.push(event.ipAddress);
    });

    // Check current login
    const currentMetadata = context.metadata as any;
    if (currentMetadata?.country) countries.add(currentMetadata.country);
    if (currentMetadata?.asn) asns.add(currentMetadata.asn);
    if (currentMetadata?.isDatacenter) datacenterIps.push(context.ipAddress);

    // Suspicious if:
    // - More than 3 different countries
    // - More than 5 different ASNs
    // - More than 50% are datacenter IPs
    const totalLogins = userLogins.length + 1;
    const datacenterRatio = datacenterIps.length / totalLogins;

    if (countries.size > 3 || asns.size > 5 || datacenterRatio > 0.5) {
      const score = Math.min(100, countries.size * 10 + asns.size * 5 + datacenterRatio * 50);

      return {
        matched: true,
        severity: datacenterRatio > 0.8 ? ThreatSeverity.CRITICAL : ThreatSeverity.HIGH,
        score: Math.round(score),
        reason: `Proxy/VPN pattern detected: ${countries.size} countries, ${asns.size} ASNs, ${Math.round(datacenterRatio * 100)}% datacenter IPs`,
        evidence: {
          uniqueCountries: countries.size,
          uniqueAsns: asns.size,
          datacenterRatio: datacenterRatio,
          datacenterIps,
          countries: Array.from(countries),
          asns: Array.from(asns),
        },
        suggestedActions: ['REQUIRE_2FA', 'INCREASE_MONITORING'],
      };
    }

    return { matched: false };
  }

  /**
   * Berechnet die Entfernung zwischen zwei Koordinaten (Haversine-Formel)
   *
   * Die Haversine-Formel berechnet die kürzeste Entfernung zwischen zwei
   * Punkten auf einer Kugeloberfläche (Großkreisentfernung). Diese Methode
   * wird verwendet, um die physische Distanz zwischen zwei Login-Standorten
   * zu ermitteln.
   *
   * @param loc1 Erste geografische Position mit Breiten- und Längengrad
   * @param loc2 Zweite geografische Position mit Breiten- und Längengrad
   * @returns Entfernung in Kilometern
   * @private
   * @example
   * ```typescript
   * const distance = this.calculateDistance(
   *   { lat: 52.520008, lon: 13.404954 }, // Berlin
   *   { lat: 48.856613, lon: 2.352222 }   // Paris
   * );
   * // Ergebnis: ~878 km
   * ```
   */
  private calculateDistance(
    loc1: { lat: number; lon: number },
    loc2: { lat: number; lon: number },
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.lat - loc1.lat);
    const dLon = this.toRad(loc2.lon - loc1.lon);
    const lat1 = this.toRad(loc1.lat);
    const lat2 = this.toRad(loc2.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Konvertiert Grad in Radianten
   * @param deg Winkel in Grad
   * @returns Winkel in Radianten
   * @private
   */
  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Kombiniert mehrere Ergebnisse
   *
   * Diese Methode aggregiert die Ergebnisse mehrerer Pattern-Checks zu einem
   * Gesamtergebnis. Dabei wird:
   * - Der höchste Schweregrad ausgewählt
   * - Der Durchschnitt der Scores berechnet
   * - Alle Gründe und Empfehlungen kombiniert
   * - Die Evidence-Daten aller Checks zusammengeführt
   *
   * @param results Array von Evaluierungsergebnissen der einzelnen Pattern-Checks
   * @returns Kombiniertes Evaluierungsergebnis
   * @private
   */
  private combineResults(results: RuleEvaluationResult[]): RuleEvaluationResult {
    const severities = results.map((r) => r.severity).filter(Boolean) as ThreatSeverity[];
    const scores = results.map((r) => r.score).filter((s) => s !== undefined) as number[];
    const reasons = results.map((r) => r.reason).filter(Boolean);
    const actions = new Set(results.flatMap((r) => r.suggestedActions || []));

    return {
      matched: true,
      severity: this.getHighestSeverity(severities),
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      reason: reasons.join('; '),
      evidence: {
        combinedPatterns: results.length,
        patterns: results.map((r) => r.evidence),
      },
      suggestedActions: Array.from(actions),
    };
  }

  /**
   * Ermittelt den höchsten Schweregrad aus einer Liste von Schweregraden
   * @param severities Array von Threat-Severities
   * @returns Der höchste Schweregrad
   * @private
   */
  private getHighestSeverity(severities: ThreatSeverity[]): ThreatSeverity {
    const order = {
      [ThreatSeverity.LOW]: 1,
      [ThreatSeverity.MEDIUM]: 2,
      [ThreatSeverity.HIGH]: 3,
      [ThreatSeverity.CRITICAL]: 4,
    };

    return severities.reduce(
      (highest, current) => (order[current] > order[highest] ? current : highest),
      ThreatSeverity.LOW,
    );
  }

  /**
   * Validiert die Regel-Konfiguration
   *
   * Diese Methode stellt sicher, dass alle erforderlichen Konfigurationsparameter
   * vorhanden und gültig sind. Die Validierung prüft:
   * - Mindestens ein Pattern ist konfiguriert
   * - Alle Zeitfenster sind positiv
   * - Schwellenwerte sind gültig
   * - MatchType ist entweder 'any' oder 'all'
   *
   * @returns true wenn die Konfiguration gültig ist, false sonst
   * @example
   * ```typescript
   * const rule = new IpHoppingRule({ config: { patterns: [] } });
   * if (!rule.validate()) {
   *   throw new Error('Ungültige Regel-Konfiguration');
   * }
   * ```
   */
  validate(): boolean {
    return (
      this.config.patterns.length > 0 &&
      this.config.lookbackMinutes > 0 &&
      this.config.maxIpsThreshold > 0 &&
      this.config.suspiciousIpChangeMinutes > 0 &&
      this.config.maxVelocityKmPerHour > 0 &&
      ['any', 'all'].includes(this.config.matchType)
    );
  }

  /**
   * Gibt eine menschenlesbare Beschreibung der Regel zurück
   *
   * Diese Methode generiert eine dynamische Beschreibung basierend auf der
   * aktuellen Konfiguration. Die Beschreibung enthält die aktiven Pattern-Typen
   * und das konfigurierte Zeitfenster.
   *
   * @returns Formatierte Beschreibung der Regel und ihrer Konfiguration
   * @example
   * ```typescript
   * const rule = new IpHoppingRule({
   *   config: { patterns: ['rapid-ip-change', 'geo-impossible'], lookbackMinutes: 30 }
   * });
   * logger.info(rule.getDescription());
   * // Output: "Detects IP hopping patterns including rapid-ip-change, geo-impossible within 30 minutes"
   * ```
   */
  getDescription(): string {
    const patterns = this.config.patterns.join(', ');
    return `Detects IP hopping patterns including ${patterns} within ${this.config.lookbackMinutes} minutes`;
  }
}
