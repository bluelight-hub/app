import { ThreatSeverity, AlertPriority, AlertStatus } from '@prisma/generated/prisma/enums';
import { ThreatDetectionRule, RuleEvaluationResult, RuleContext } from '../rules/rule.interface';

/**
 * Kontext für die Generierung von Sicherheitswarnungen
 *
 * Enthält alle notwendigen Informationen zur Erstellung und Verarbeitung
 * von Sicherheitswarnungen basierend auf erkannten Bedrohungen
 *
 * @interface SecurityAlertContext
 */
export interface SecurityAlertContext {
  // Source Information
  /** Die Regel, die den Alert ausgelöst hat */
  sourceRule?: ThreatDetectionRule;
  /** ID des auslösenden Ereignisses */
  sourceEventId?: string;
  /** Ergebnis der Regel-Evaluierung */
  ruleEvaluationResult: RuleEvaluationResult;
  /** Kontext der Regel-Evaluierung */
  ruleContext: RuleContext;

  // Alert Metadata
  /** Typ des Alerts (z.B. 'brute-force', 'session-hijacking') */
  alertType: string;
  /** Schweregrad der erkannten Bedrohung */
  severity: ThreatSeverity;
  /** Priorität für die Bearbeitung */
  priority?: AlertPriority;
  /** Überschrift des Alerts für die Anzeige */
  title: string;
  /** Detaillierte Beschreibung der Bedrohung */
  description: string;

  // Additional Context
  /** Beweismaterial und zusätzliche Daten zur Bedrohung */
  evidence: Record<string, any>;
  /** Empfohlene Maßnahmen zur Behändlung */
  suggestedActions?: string[];
  /** Schlüssel zur Gruppierung zusammenhängender Alerts */
  correlationKey?: string;
  /** Automatisches Verwerfen nach X Minuten */
  timeToLive?: number;
}

/**
 * Komponenten für Alert-Fingerprinting zur Duplikatserkennung
 *
 * Definiert die Felder, die zur Erstellung eines eindeutigen Fingerprints
 * für Alerts verwendet werden, um Duplikate zu erkennen und zu vermeiden
 *
 * @interface AlertFingerprintComponents
 */
export interface AlertFingerprintComponents {
  /** Typ des Alerts für Fingerprinting */
  alertType: string;
  /** Benutzer-ID für benutzerspezifische Alerts */
  userId?: string;
  /** IP-Adresse für IP-basierte Alerts */
  ipAddress?: string;
  /** Regel-ID für regelbasierte Alerts */
  ruleId?: string;
  /** Zeitfenster in Minuten für Duplikatserkennung */
  timeWindow?: number;
  /** Zusätzliche Schlüssel für erweiterte Fingerprints */
  customKeys?: string[];
}

/**
 * Konfiguration für Alert-Korrelation
 *
 * Definiert, wie zusammenhängende Alerts erkannt und gruppiert werden,
 * um Alert-Fatigue zu reduzieren und zusammenhängende Vorfälle zu erkennen
 *
 * @interface AlertCorrelationConfig
 */
export interface AlertCorrelationConfig {
  /**
   * Zeitfenster für Korrelation in Minuten
   * Alerts innerhalb dieses Zeitfensters werden auf Zusammenhänge geprüft
   * @example 15
   */
  correlationWindow: number;

  /**
   * Felder, die für die Korrelation übereinstimmen müssen
   * @example ['userId', 'ipAddress', 'alertType']
   */
  correlationKeys: string[];

  /**
   * Maximale Anzahl von Child-Alerts pro Parent-Alert
   * @example 100
   */
  maxChildAlerts: number;

  /**
   * Strategie für die Aggregation korrelierter Alerts
   * - 'count': Nach Anzahl ähnlicher Alerts
   * - 'time': Nach Zeitintervallen
   * - 'severity': Nach höchster Schweregrad
   */
  aggregationStrategy: 'count' | 'time' | 'severity';
}

/**
 * Ergebnis der Alert-Verarbeitung
 *
 * Enthält Informationen über den Verarbeitungsstatus eines Alerts,
 * einschließlich Duplikatserkennung und Korrelation mit anderen Alerts
 *
 * @interface AlertProcessingResult
 */
export interface AlertProcessingResult {
  /** ID des verarbeiteten Alerts */
  alertId: string;
  /** Gibt an, ob dies ein neuer Alert ist */
  isNew: boolean;
  /** Gibt an, ob dies ein Duplikat eines bestehenden Alerts ist */
  isDuplicate: boolean;
  /** Gibt an, ob der Alert mit anderen korreliert wurde */
  isCorrelated: boolean;
  /** ID des übergeordneten Alerts bei Korrelation */
  parentAlertId?: string;
  /** Status der Benachrichtigungsversendung */
  notificationsSent: boolean;
  /** Fehlermeldung bei Verarbeitungsfehlern */
  error?: string;
}

/**
 * Optionen für Alert-Abfragen
 *
 * Definiert Filter- und Sortieroptionen für die Abfrage von Sicherheitswarnungen
 * aus der Datenbank mit umfangreichen Filtermöglichkeiten
 *
 * @interface AlertQueryOptions
 */
export interface AlertQueryOptions {
  /** Filter nach Alert-Status */
  status?: AlertStatus[];
  /** Filter nach Schweregrad */
  severity?: ThreatSeverity[];
  /** Filter nach Priorität */
  priority?: AlertPriority[];
  /** Filter nach Alert-Typen */
  alertTypes?: string[];
  /** Filter nach Benutzer-ID */
  userId?: string;
  /** Filter nach IP-Adresse */
  ipAddress?: string;
  /** Filter nach Korrelations-ID */
  correlationId?: string;
  /** Zeitbereichsfilter für Alert-Erstellung */
  timeRange?: {
    /** Startdatum des Zeitbereichs */
    start: Date;
    /** Enddatum des Zeitbereichs */
    end: Date;
  };
  /** Gelöste Alerts einschließen */
  includeResolved?: boolean;
  /** Abgelaufene Alerts einschließen */
  includeExpired?: boolean;
  /** Maximale Anzahl der Ergebnisse */
  limit?: number;
  /** Offset für Paginierung */
  offset?: number;
  /** Sortierfeld */
  orderBy?: 'createdAt' | 'severity' | 'priority';
  /** Sortierrichtung */
  orderDirection?: 'asc' | 'desc';
}

/**
 * Statistische Auswertung von Sicherheitswarnungen
 *
 * Aggregierte Statistiken über Alerts für Reporting und Dashboard-Anzeigen
 *
 * @interface AlertStatistics
 */
export interface AlertStatistics {
  /** Gesamtanzahl der Alerts */
  total: number;
  /** Anzahl der Alerts nach Status */
  byStatus: Record<AlertStatus, number>;
  /** Anzahl der Alerts nach Schweregrad */
  bySeverity: Record<ThreatSeverity, number>;
  /** Anzahl der Alerts nach Priorität */
  byPriority: Record<AlertPriority, number>;
  /** Anzahl der Alerts nach Typ */
  byAlertType: Record<string, number>;
  /** Durchschnittliche Reaktionszeit in Minuten */
  averageResponseTime?: number;
  /** Durchschnittliche Lösungszeit in Minuten */
  averageResolutionTime?: number;
}

/**
 * Konfiguration für Alert-Benachrichtigungen
 *
 * Definiert wie und wann Benachrichtigungen für Sicherheitswarnungen
 * versendet werden sollen, einschließlich Eskalationsregeln
 *
 * @interface AlertNotificationConfig
 */
export interface AlertNotificationConfig {
  /** Benachrichtigungskanäle (z.B. ['email', 'webhook']) */
  channels: string[];
  /** Minimaler Schweregrad für Benachrichtigungen */
  severityThreshold?: ThreatSeverity;
  /** Minimale Priorität für Benachrichtigungen */
  priorityThreshold?: AlertPriority;
  /** Beweismaterial in Benachrichtigung einschließen */
  includeEvidence?: boolean;
  /** Benutzerdefinierte Benachrichtigungsvorlage */
  customTemplate?: string;
  /** Eskalationsregeln für unbehandelte Alerts */
  escalationRules?: {
    /** Zeitschwelle in Minuten bis zur Eskalation */
    timeThreshold: number;
    /** Empfänger der Eskalation */
    escalateTo: string[];
  }[];
}
