import { SecurityEventType } from '../constants/auth.constants';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';

/**
 * Kontext für die Regel-Evaluierung.
 *
 * Enthält alle relevanten Informationen, die für die Bewertung
 * von Sicherheitsregeln benötigt werden. Der Kontext wird bei
 * jedem sicherheitsrelevanten Ereignis erstellt und an die
 * Regel-Engine weitergegeben.
 *
 * @example
 * ```typescript
 * const context: RuleContext = {
 *   userId: 'user123',
 *   email: 'user@example.com',
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...',
 *   timestamp: new Date(),
 *   eventType: SecurityEventType.LOGIN_ATTEMPT,
 *   metadata: { failedAttempts: 3 },
 *   recentEvents: [...]
 * };
 * ```
 */
export interface RuleContext {
  /**
   * ID des betroffenen Benutzers
   * @property {string} [userId] - Eindeutige Benutzer-ID
   */
  userId?: string;

  /**
   * E-Mail-Adresse des Benutzers
   * @property {string} [email] - Benutzer-E-Mail
   */
  email?: string;

  /**
   * IP-Adresse der Anfrage
   * @property {string} [ipAddress] - Client-IP-Adresse
   */
  ipAddress?: string;

  /**
   * User-Agent-String des Clients
   * @property {string} [userAgent] - Browser/Client-Identifikation
   */
  userAgent?: string;

  /**
   * Zeitstempel des Ereignisses
   * @property {Date} timestamp - Ereigniszeitpunkt
   */
  timestamp: Date;

  /**
   * Typ des Sicherheitsereignisses
   * @property {SecurityEventType} eventType - Art des Ereignisses
   */
  eventType: SecurityEventType;

  /**
   * Zusätzliche Metadaten zum Ereignis
   * @property {Record<string, any>} [metadata] - Ereignis-spezifische Daten
   */
  metadata?: Record<string, any>;

  /**
   * Session-ID des Benutzers
   * @property {string} [sessionId] - Aktuelle Session-ID
   */
  sessionId?: string;

  /**
   * Historische Ereignisse für Musteranalyse
   * @property {Array} [recentEvents] - Liste vergangener Ereignisse
   */
  recentEvents?: Array<{
    eventType: SecurityEventType;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    metadata?: Record<string, any>;
  }>;
}

/**
 * Ergebnis einer Regel-Evaluierung.
 *
 * Dieses Interface definiert die Struktur des Ergebnisses,
 * das von einer Sicherheitsregel nach der Auswertung zurückgegeben wird.
 * Es enthält Informationen darüber, ob die Regel ausgelöst wurde,
 * sowie Details zur Schwere und empfohlene Maßnahmen.
 *
 * @example
 * ```typescript
 * const result: RuleEvaluationResult = {
 *   matched: true,
 *   severity: ThreatSeverity.HIGH,
 *   score: 85,
 *   reason: 'Mehrere fehlgeschlagene Login-Versuche erkannt',
 *   evidence: { attempts: 5, timeWindow: '5 Minuten' },
 *   suggestedActions: ['Account temporär sperren', 'E-Mail-Benachrichtigung senden']
 * };
 * ```
 */
export interface RuleEvaluationResult {
  /**
   * Gibt an, ob die Regel ausgelöst wurde
   * @property {boolean} matched - true wenn Bedrohung erkannt
   */
  matched: boolean;

  /**
   * Schweregrad der erkannten Bedrohung
   * @property {ThreatSeverity} [severity] - Bedrohungsstufe
   */
  severity?: ThreatSeverity;

  /**
   * Numerischer Score der Bedrohung (0-100)
   * @property {number} [score] - Bedrohungsbewertung
   */
  score?: number;

  /**
   * Beschreibung warum die Regel ausgelöst wurde
   * @property {string} [reason] - Auslösegrund
   */
  reason?: string;

  /**
   * Beweisdaten für die erkannte Bedrohung
   * @property {Record<string, any>} [evidence] - Beweismaterial
   */
  evidence?: Record<string, any>;

  /**
   * Empfohlene Maßnahmen zur Reaktion
   * @property {string[]} [suggestedActions] - Handlungsempfehlungen
   */
  suggestedActions?: string[];

  /**
   * ID der Regel, die das Ergebnis produziert hat
   * @property {string} [ruleId] - Regel-ID
   */
  ruleId?: string;

  /**
   * Name der Regel, die das Ergebnis produziert hat
   * @property {string} [ruleName] - Regelname
   */
  ruleName?: string;

  /**
   * Tags der Regel, die das Ergebnis produziert hat
   * @property {string[]} [tags] - Regel-Tags
   */
  tags?: string[];
}

/**
 * Basisinterface für alle Threat Detection Rules.
 *
 * Definiert die grundlegende Struktur und Funktionalität, die
 * jede Sicherheitsregel implementieren muss. Regeln können verschiedene
 * Arten von Bedrohungen erkennen, wie z.B. Brute-Force-Angriffe,
 * Account-Enumeration oder verdächtige Aktivitäten.
 *
 * @example
 * ```typescript
 * class BruteForceRule implements ThreatDetectionRule {
 *   id = 'brute-force-detection';
 *   name = 'Brute Force Detection';
 *   severity = ThreatSeverity.HIGH;
 *
 *   async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
 *     // Implementierung der Regel-Logik
 *   }
 * }
 * ```
 */
export interface ThreatDetectionRule {
  /**
   * Eindeutige Regel-ID
   * @property {string} id - Regel-Identifier
   */
  id: string;

  /**
   * Lesbarer Name der Regel
   * @property {string} name - Regelname
   */
  name: string;

  /**
   * Ausführliche Beschreibung der Regel
   * @property {string} description - Regelbeschreibung
   */
  description: string;

  /**
   * Versionsnummer der Regel
   * @property {string} version - Regelversion (semantic versioning)
   */
  version: string;

  /**
   * Aktueller Status der Regel
   * @property {RuleStatus} status - Regelstatus (ACTIVE/INACTIVE)
   */
  status: RuleStatus;

  /**
   * Standard-Schweregrad der Regel
   * @property {ThreatSeverity} severity - Bedrohungsschweregrad
   */
  severity: ThreatSeverity;

  /**
   * Typ der Bedingung für diese Regel
   * @property {ConditionType} conditionType - Art der Regelbedingung
   */
  conditionType: ConditionType;

  /**
   * Konfiguration der Regel.
   *
   * Enthält regelspezifische Parameter wie Schwellenwerte,
   * Zeitfenster oder andere Konfigurationsoptionen.
   *
   * @example
   * ```typescript
   * config: {
   *   threshold: 5,
   *   timeWindowMinutes: 15,
   *   blockDurationMinutes: 30
   * }
   * ```
   */
  config: Record<string, any>;

  /**
   * Tags zur Kategorisierung der Regel.
   *
   * Ermöglicht die Gruppierung und Filterung von Regeln
   * nach verschiedenen Kriterien.
   *
   * @example ['authentication', 'brute-force', 'high-priority']
   */
  tags: string[];

  /**
   * Evaluiert die Regel gegen den gegebenen Kontext.
   *
   * Diese Methode enthält die Hauptlogik der Regel und bestimmt,
   * ob die definierten Bedingungen erfüllt sind.
   *
   * @param context - Der Evaluierungskontext mit allen relevanten Daten
   * @returns Ein Promise mit dem Evaluierungsergebnis
   *
   * @example
   * ```typescript
   * const result = await rule.evaluate(context);
   * if (result.matched) {
   *   logger.warn('Regel ausgelöst:', result.reason);
   * }
   * ```
   */
  evaluate(context: RuleContext): Promise<RuleEvaluationResult>;

  /**
   * Validiert die Regel-Konfiguration.
   *
   * Stellt sicher, dass alle erforderlichen Konfigurationsparameter
   * vorhanden und gültig sind.
   *
   * @returns true wenn die Konfiguration gültig ist, sonst false
   *
   * @example
   * ```typescript
   * if (!rule.validate()) {
   *   throw new Error('Ungültige Regel-Konfiguration');
   * }
   * ```
   */
  validate(): boolean;

  /**
   * Gibt eine menschenlesbare Beschreibung der Regel zurück.
   *
   * Die Beschreibung sollte erklären, was die Regel tut und
   * unter welchen Bedingungen sie ausgelöst wird.
   *
   * @returns Eine detaillierte Beschreibung der Regel
   *
   * @example
   * ```typescript
   * logger.info(rule.getDescription());
   * // "Diese Regel erkennt Brute-Force-Angriffe durch Überwachung..."
   * ```
   */
  getDescription(): string;
}

/**
 * Interface für Regeln, die auf Schwellenwerten basieren.
 *
 * Diese Regeln lösen aus, wenn ein bestimmter Schwellenwert
 * innerhalb eines definierten Zeitfensters überschritten wird.
 * Typische Anwendungsfälle sind die Erkennung von Brute-Force-Angriffen
 * oder Rate-Limiting-Verletzungen.
 *
 * @example
 * ```typescript
 * const rule: ThresholdRule = {
 *   config: {
 *     threshold: 5,
 *     timeWindowMinutes: 10,
 *     countField: 'failedAttempts'
 *   },
 *   // ... weitere Eigenschaften
 * };
 * ```
 */
export interface ThresholdRule extends ThreatDetectionRule {
  /**
   * Konfiguration für schwellenwertbasierte Regeln.
   *
   * Definiert die Parameter für die Überwachung von Ereignishäufigkeiten
   * und das Auslösen bei Überschreitung von Grenzwerten.
   */
  config: {
    /**
     * Der Schwellenwert, der überschritten werden muss.
     * Definiert die maximale Anzahl erlaubter Ereignisse
     * innerhalb des Zeitfensters.
     * @example 5 // Maximal 5 fehlgeschlagene Login-Versuche
     */
    threshold: number;

    /**
     * Das Zeitfenster in Minuten für die Schwellenwertprüfung.
     * Ereignisse außerhalb dieses Fensters werden nicht gezählt.
     * @example 10 // Prüfe Ereignisse der letzten 10 Minuten
     */
    timeWindowMinutes: number;

    /**
     * Der Name des Feldes, das gezählt werden soll.
     * Verweist auf ein Feld im RuleContext oder in den Metadaten.
     * @example 'failedAttempts' // Zähle fehlgeschlagene Versuche
     */
    countField: string;
  };
}

/**
 * Interface für Regeln, die Muster erkennen.
 *
 * Diese Regeln suchen nach bestimmten Mustern in den Daten,
 * wie z.B. verdächtige User-Agent-Strings, SQL-Injection-Versuche
 * oder andere bekannte Angriffsmuster.
 *
 * @example
 * ```typescript
 * const rule: PatternRule = {
 *   config: {
 *     patterns: ['sqlmap', 'nikto', 'nmap'],
 *     matchType: 'any',
 *     lookbackMinutes: 60
 *   },
 *   // ... weitere Eigenschaften
 * };
 * ```
 */
export interface PatternRule extends ThreatDetectionRule {
  /**
   * Konfiguration für musterbasierte Regeln.
   *
   * Definiert die Parameter für die Erkennung von Mustern
   * in User-Agents, URLs oder anderen Eingabedaten.
   */
  config: {
    /**
     * Liste der zu suchenden Muster.
     * Kann reguläre Ausdrücke oder einfache Strings enthalten.
     * @example ['sqlmap', 'nikto', 'nmap', '(union|select).*from']
     */
    patterns: string[];

    /**
     * Bestimmt, wie die Muster ausgewertet werden.
     * - 'any': Mindestens ein Muster muss zutreffen
     * - 'all': Alle Muster müssen zutreffen
     * @default 'any'
     */
    matchType: 'any' | 'all';

    /**
     * Zeitfenster in Minuten für die Mustersuche.
     * Bestimmt, wie weit in die Vergangenheit nach Mustern
     * gesucht werden soll.
     * @example 60 // Prüfe Aktivitäten der letzten Stunde
     */
    lookbackMinutes: number;
  };
}

/**
 * Interface für zeitbasierte Regeln.
 *
 * Diese Regeln prüfen, ob Aktivitäten zu ungewöhnlichen Zeiten
 * stattfinden, z.B. außerhalb der Geschäftszeiten oder an Wochenenden.
 * Sie können zur Erkennung von automatisierten Angriffen oder
 * kompromittierten Accounts verwendet werden.
 *
 * @example
 * ```typescript
 * const rule: TimeBasedRule = {
 *   config: {
 *     allowedHours: { start: 8, end: 18 },
 *     allowedDays: [1, 2, 3, 4, 5], // Mo-Fr
 *     timezone: 'Europe/Berlin'
 *   },
 *   // ... weitere Eigenschaften
 * };
 * ```
 */
export interface TimeBasedRule extends ThreatDetectionRule {
  /**
   * Konfiguration für zeitbasierte Regeln.
   *
   * Definiert die Parameter für die Überprüfung von Aktivitäten
   * basierend auf Tageszeit, Wochentag oder anderen zeitlichen Mustern.
   */
  config: {
    /**
     * Erlaubte Uhrzeiten für Aktivitäten.
     * Definiert ein Zeitfenster mit Start- und Endzeit (0-23).
     * Aktivitäten außerhalb dieses Fensters gelten als verdächtig.
     * @example { start: 8, end: 18 } // Nur zwischen 8:00 und 18:00 Uhr
     */
    allowedHours?: { start: number; end: number };

    /**
     * Erlaubte Wochentage für Aktivitäten.
     * Array mit Wochentagen (0-6), wobei 0 = Sonntag.
     * Aktivitäten an anderen Tagen gelten als verdächtig.
     * @example [1, 2, 3, 4, 5] // Nur Montag bis Freitag
     */
    allowedDays?: number[]; // 0-6, 0 = Sonntag

    /**
     * Zeitzone für die Zeitprüfung.
     * IANA Zeitzonenbezeichnung für die korrekte Zeitberechnung.
     * @example 'Europe/Berlin'
     * @default 'UTC'
     */
    timezone?: string;
  };
}

/**
 * Interface für geografische Regeln.
 *
 * Diese Regeln analysieren geografische Daten wie IP-Adressen
 * und Standorte, um verdächtige Aktivitäten zu erkennen.
 * Beispiele sind unmögliche Reisegeschwindigkeiten oder
 * Zugriffe aus gesperrten Ländern.
 *
 * @example
 * ```typescript
 * const rule: GeoBasedRule = {
 *   config: {
 *     allowedCountries: ['DE', 'AT', 'CH'],
 *     blockedCountries: ['XX', 'YY'],
 *     maxDistanceKm: 1000,
 *     checkVelocity: true
 *   },
 *   // ... weitere Eigenschaften
 * };
 * ```
 */
export interface GeoBasedRule extends ThreatDetectionRule {
  /**
   * Konfiguration für geografische Regeln.
   *
   * Definiert die Parameter für die Überprüfung geografischer
   * Anomalien und Beschränkungen.
   */
  config: {
    /**
     * Liste der erlaubten Länder (ISO 3166-1 alpha-2).
     * Wenn definiert, werden nur Zugriffe aus diesen Ländern erlaubt.
     * @example ['DE', 'AT', 'CH']
     */
    allowedCountries?: string[];

    /**
     * Liste der gesperrten Länder (ISO 3166-1 alpha-2).
     * Zugriffe aus diesen Ländern werden als verdächtig eingestuft.
     * @example ['XX', 'YY'] // Hochrisiko-Länder
     */
    blockedCountries?: string[];

    /**
     * Maximale Distanz in Kilometern für Reisegeschwindigkeitsprüfung.
     * Wenn ein Benutzer innerhalb kurzer Zeit von zwei weit entfernten
     * Orten zugreift, wird dies als verdächtig eingestuft.
     * @example 1000 // Maximal 1000km zwischen zwei Zugriffen
     */
    maxDistanceKm?: number;

    /**
     * Aktiviert die Überprüfung der Reisegeschwindigkeit.
     * Wenn true, wird geprüft, ob die Bewegung zwischen zwei
     * Standorten physikalisch möglich ist.
     * @default false
     */
    checkVelocity?: boolean;
  };
}

/**
 * Factory-Interface für Regel-Erstellung.
 *
 * Ermöglicht die dynamische Erstellung von Regel-Instanzen
 * basierend auf Typ und Konfiguration. Wird verwendet, um
 * Regeln aus der Datenbank oder Konfigurationsdateien zu laden.
 *
 * @example
 * ```typescript
 * const factory: RuleFactory = new DefaultRuleFactory();
 * const rule = factory.createRule('brute-force', {
 *   threshold: 5,
 *   timeWindowMinutes: 15
 * });
 * ```
 */
export interface RuleFactory {
  /**
   * Erstellt eine neue Regel-Instanz basierend auf Typ und Konfiguration.
   *
   * @param type - Der Typ der zu erstellenden Regel (z.B. 'brute-force', 'geo-based')
   * @param config - Die Konfiguration für die Regel
   * @returns Eine neue Instanz der angeforderten Regel
   *
   * @throws {Error} Wenn der Regeltyp nicht unterstützt wird
   *
   * @example
   * ```typescript
   * const rule = factory.createRule('threshold', {
   *   threshold: 10,
   *   timeWindowMinutes: 5,
   *   countField: 'loginAttempts'
   * });
   * ```
   */
  createRule(type: string, config: Record<string, any>): ThreatDetectionRule;
}

/**
 * Interface für den Rule Manager.
 *
 * Der Rule Manager ist die zentrale Komponente für die Verwaltung
 * von Sicherheitsregeln. Er lädt, speichert, aktualisiert und
 * führt Regeln aus. Er koordiniert die Evaluierung mehrerer
 * Regeln und aggregiert deren Ergebnisse.
 *
 * @example
 * ```typescript
 * const manager: RuleManager = new DefaultRuleManager();
 * const rules = await manager.loadRules();
 * const results = await manager.evaluateRules(context);
 * ```
 */
export interface RuleManager {
  /**
   * Lädt alle aktiven Regeln aus der Datenbank oder Konfiguration.
   *
   * @returns Ein Promise mit einem Array aller geladenen Regeln
   *
   * @example
   * ```typescript
   * const rules = await manager.loadRules();
   * logger.info(`${rules.length} Regeln geladen`);
   * ```
   */
  loadRules(): Promise<ThreatDetectionRule[]>;

  /**
   * Ruft eine spezifische Regel anhand ihrer ID ab.
   *
   * @param id - Die eindeutige ID der Regel
   * @returns Ein Promise mit der Regel oder null, wenn nicht gefunden
   *
   * @example
   * ```typescript
   * const rule = await manager.getRule('brute-force-detection');
   * if (rule) {
   *   logger.info('Regel gefunden:', rule.name);
   * }
   * ```
   */
  getRule(id: string): Promise<ThreatDetectionRule | null>;

  /**
   * Fügt eine neue Regel zum System hinzu.
   *
   * @param rule - Die hinzuzufügende Regel
   * @throws {Error} Wenn eine Regel mit derselben ID bereits existiert
   *
   * @example
   * ```typescript
   * await manager.addRule(newBruteForceRule);
   * ```
   */
  addRule(rule: ThreatDetectionRule): Promise<void>;

  /**
   * Aktualisiert eine bestehende Regel.
   *
   * @param id - Die ID der zu aktualisierenden Regel
   * @param rule - Die zu aktualisierenden Eigenschaften
   * @throws {Error} Wenn die Regel nicht gefunden wird
   *
   * @example
   * ```typescript
   * await manager.updateRule('brute-force-detection', {
   *   config: { threshold: 10 }
   * });
   * ```
   */
  updateRule(id: string, rule: Partial<ThreatDetectionRule>): Promise<void>;

  /**
   * Löscht eine Regel aus dem System.
   *
   * @param id - Die ID der zu löschenden Regel
   * @throws {Error} Wenn die Regel nicht gefunden wird
   *
   * @example
   * ```typescript
   * await manager.deleteRule('obsolete-rule');
   * ```
   */
  deleteRule(id: string): Promise<void>;

  /**
   * Evaluiert alle aktiven Regeln gegen einen gegebenen Kontext.
   *
   * @param context - Der Kontext für die Regel-Evaluierung
   * @returns Ein Promise mit den Ergebnissen aller evaluierten Regeln
   *
   * @example
   * ```typescript
   * const results = await manager.evaluateRules(context);
   * const threats = results.filter(r => r.matched);
   * if (threats.length > 0) {
   *   logger.warn('Bedrohungen erkannt:', threats);
   * }
   * ```
   */
  evaluateRules(context: RuleContext): Promise<RuleEvaluationResult[]>;
}
