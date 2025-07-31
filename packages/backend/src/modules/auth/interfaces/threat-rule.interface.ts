import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';

/**
 * Interface für Threat Detection Rules
 *
 * Diese Interface definiert die Struktur von Threat Detection Rules,
 * die sowohl für das Seeding als auch für die Verwaltung der Regeln
 * verwendet wird. Jede Regel enthält eine eindeutige Konfiguration
 * zur Erkennung spezifischer Sicherheitsbedrohungen.
 *
 * @interface ThreatDetectionRuleData
 *
 * @example
 * ```typescript
 * const rule: ThreatDetectionRuleData = {
 *   id: 'brute-force-default',
 *   name: 'Brute Force Detection',
 *   description: 'Detects repeated failed login attempts from the same IP address',
 *   version: '1.0.0',
 *   status: RuleStatus.ACTIVE,
 *   severity: ThreatSeverity.HIGH,
 *   conditionType: ConditionType.THRESHOLD,
 *   config: {
 *     threshold: 5,
 *     timeWindow: 300,
 *     blockDuration: 3600
 *   },
 *   tags: ['authentication', 'brute-force', 'security']
 * };
 * ```
 */
export interface ThreatDetectionRuleData {
  /**
   * Eindeutige ID der Regel
   *
   * Sollte im Format "rule-type-variant" sein
   *
   * @property {string} id - Regel-Identifier
   * @example "brute-force-default"
   */
  id: string;

  /**
   * Lesbarer Name der Regel
   *
   * Kurze, prägnante Beschreibung der Regel
   *
   * @property {string} name - Regelname
   * @example "Brute Force Detection"
   */
  name: string;

  /**
   * Ausführliche Beschreibung der Regel und ihrer Funktion
   *
   * Erklärt was die Regel erkennt und wie sie funktioniert
   *
   * @property {string} description - Regelbeschreibung
   * @example "Detects repeated failed login attempts from the same IP address"
   */
  description: string;

  /**
   * Semantische Versionsnummer der Regel
   *
   * Folgt dem Semantic Versioning Standard (MAJOR.MINOR.PATCH)
   *
   * @property {string} version - Regelversion
   * @example "1.0.0"
   */
  version: string;

  /**
   * Aktueller Status der Regel im System
   *
   * Bestimmt ob die Regel aktiv ist und Events evaluiert
   *
   * @property {RuleStatus} status - Regelstatus
   * @example RuleStatus.ACTIVE
   */
  status: RuleStatus;

  /**
   * Schweregrad der erkannten Bedrohung
   *
   * Bestimmt die Priorität und Reaktion auf erkannte Bedrohungen
   *
   * @property {ThreatSeverity} severity - Bedrohungsschweregrad
   * @example ThreatSeverity.HIGH
   */
  severity: ThreatSeverity;

  /**
   * Art der Bedingung, die die Regel verwendet
   *
   * Definiert den Evaluierungsmechanismus der Regel
   *
   * @property {ConditionType} conditionType - Bedingungstyp
   * @example ConditionType.THRESHOLD
   */
  conditionType: ConditionType;

  /**
   * Regel-spezifische Konfiguration mit Parametern
   *
   * Enthält alle konfigurierbaren Parameter der Regel
   *
   * @property {Record<string, any>} config - Regelkonfiguration
   * @example { threshold: 5, timeWindow: 300, blockDuration: 3600 }
   */
  config: Record<string, any>;

  /**
   * Tags zur Kategorisierung und Filterung
   *
   * Ermöglicht einfache Gruppierung und Suche von Regeln
   *
   * @property {string[]} tags - Regel-Tags
   * @example ["authentication", "brute-force", "security"]
   */
  tags: string[];
}

/**
 * Extended rule data für dry-run Ergebnisse
 *
 * Erweitert ThreatDetectionRuleData um Informationen darüber,
 * welche Aktion bei einem Dry-Run durchgeführt werden würde.
 * Wird verwendet, um Änderungen vor der Ausführung zu simulieren.
 *
 * @interface ThreatDetectionRuleDataWithAction
 * @extends {ThreatDetectionRuleData}
 *
 * @example
 * ```typescript
 * const dryRunRule: ThreatDetectionRuleDataWithAction = {
 *   ...ruleData,
 *   wouldBe: 'imported'
 * };
 * ```
 */
export interface ThreatDetectionRuleDataWithAction extends ThreatDetectionRuleData {
  /**
   * Aktion, die bei einem echten Import durchgeführt werden würde
   *
   * Zeigt an, was mit der Regel passieren würde:
   * - 'imported': Neue Regel würde importiert
   * - 'updated': Bestehende Regel würde aktualisiert
   * - 'skipped': Regel würde übersprungen
   *
   * @property {('imported' | 'updated' | 'skipped')} [wouldBe] - Simulierte Aktion
   */
  wouldBe?: 'imported' | 'updated' | 'skipped';
}

/**
 * Result type für Threat Rule Seeding Operationen
 *
 * Enthält detaillierte Statistiken über den Import-/Update-Prozess
 * von Threat Detection Rules, sowohl für tatsächliche als auch
 * für Dry-Run-Operationen.
 *
 * @interface ThreatRuleSeedResult
 *
 * @example
 * ```typescript
 * const result: ThreatRuleSeedResult = {
 *   imported: 3,
 *   updated: 2,
 *   skipped: 1,
 *   errors: 0,
 *   rules: [
 *     { id: 'rule1', name: 'Rule 1', ... },
 *     { id: 'rule2', name: 'Rule 2', ... }
 *   ]
 * };
 * ```
 */
export interface ThreatRuleSeedResult {
  /**
   * Anzahl neu importierter Regeln
   *
   * @property {number} [imported] - Import-Zähler
   */
  imported?: number;

  /**
   * Anzahl aktualisierter bestehender Regeln
   *
   * @property {number} [updated] - Update-Zähler
   */
  updated?: number;

  /**
   * Anzahl übersprungener Regeln
   *
   * @property {number} [skipped] - Skip-Zähler
   */
  skipped?: number;

  /**
   * Anzahl aufgetretener Fehler
   *
   * @property {number} [errors] - Fehler-Zähler
   */
  errors?: number;

  /**
   * Anzahl Regeln, die bei Dry-Run importiert würden
   *
   * @property {number} [wouldImport] - Dry-Run Import-Zähler
   */
  wouldImport?: number;

  /**
   * Anzahl Regeln, die bei Dry-Run aktualisiert würden
   *
   * @property {number} [wouldUpdate] - Dry-Run Update-Zähler
   */
  wouldUpdate?: number;

  /**
   * Anzahl Regeln, die bei Dry-Run übersprungen würden
   *
   * @property {number} [wouldSkip] - Dry-Run Skip-Zähler
   */
  wouldSkip?: number;

  /**
   * Detaillierte Liste der verarbeiteten Regeln
   *
   * @property {(ThreatDetectionRuleData | ThreatDetectionRuleDataWithAction)[]} [rules] - Regel-Details
   */
  rules?: (ThreatDetectionRuleData | ThreatDetectionRuleDataWithAction)[];
}

/**
 * Options für Threat Rule Seeding
 *
 * Konfigurationsoptionen für den Import und die Aktivierung
 * von vordefinierten Threat Detection Rules beim System-Start.
 * Ermöglicht flexible Konfiguration je nach Umgebung.
 *
 * @interface ThreatRuleSeedOptions
 *
 * @example
 * ```typescript
 * const options: ThreatRuleSeedOptions = {
 *   preset: 'standard',
 *   reset: false,
 *   dryRun: true,
 *   activate: false,
 *   skipExisting: true
 * };
 * ```
 */
export interface ThreatRuleSeedOptions {
  /**
   * Vordefiniertes Set von Regeln
   *
   * Bestimmt welche Regel-Sets importiert werden:
   * - 'minimal': Nur kritische Regeln (Brute Force, Session Hijacking)
   * - 'standard': Empfohlenes Set für Produktivumgebungen
   * - 'maximum': Alle verfügbaren Regeln
   * - 'development': Spezielle Regeln für Entwicklungsumgebungen
   *
   * @property {('minimal' | 'standard' | 'maximum' | 'development')} preset - Regel-Preset
   */
  preset: 'minimal' | 'standard' | 'maximum' | 'development';

  /**
   * Löscht alle bestehenden Regeln vor dem Import
   *
   * VORSICHT: Entfernt alle benutzerdefinierten Regeln!
   *
   * @property {boolean} [reset=false] - Reset-Flag
   * @default false
   */
  reset?: boolean;

  /**
   * Führt nur eine Simulation durch ohne tatsächliche Änderungen
   *
   * Nützlich um zu sehen, welche Änderungen durchgeführt würden
   *
   * @property {boolean} [dryRun=false] - Dry-Run-Flag
   * @default false
   */
  dryRun?: boolean;

  /**
   * Aktiviert alle importierten Regeln automatisch
   *
   * Wenn false, werden Regeln im INACTIVE Status importiert
   *
   * @property {boolean} [activate=false] - Aktivierungs-Flag
   * @default false
   */
  activate?: boolean;

  /**
   * Überspringt bestehende Regeln anstatt sie zu aktualisieren
   *
   * Behält benutzerdefinierte Konfigurationen bei
   *
   * @property {boolean} [skipExisting=false] - Skip-Flag
   * @default false
   */
  skipExisting?: boolean;
}
