import { AlertType, ThreatSeverity } from '@prisma/generated/prisma';

/**
 * Komponenten für die Generierung eines Alert-Fingerprints
 * zur Deduplizierung von ähnlichen Alerts
 */
export interface AlertFingerprintComponents {
  /** Event-Typ oder Alert-Typ */
  type: string;
  /** Benutzer-ID (optional) */
  userId?: string;
  /** IP-Adresse (optional) */
  ipAddress?: string;
  /** Rule-ID falls durch Rule ausgelöst (optional) */
  ruleId?: string;
  /** Zusätzliche Komponenten für spezifische Alert-Typen */
  additionalComponents?: Record<string, string>;
}

/**
 * Ergebnis der Alert-Verarbeitung
 */
export interface AlertProcessingResult {
  /** ID des verarbeiteten oder deduplizierten Alerts */
  alertId: string;
  /** Status der Verarbeitung */
  status: 'created' | 'deduplicated' | 'failed';
  /** Ob es sich um ein Duplikat handelt */
  isDuplicate: boolean;
  /** Fehlermeldung bei Verarbeitungsfehlern */
  error?: string;
}

/**
 * Kontext für die manuelle Erstellung von Security Alerts
 */
export interface SecurityAlertContext {
  /** Alert-Typ */
  type?: AlertType;
  /** Schweregrad des Alerts */
  severity: ThreatSeverity;
  /** Titel des Alerts */
  title: string;
  /** Detaillierte Beschreibung */
  description: string;
  /** Benutzer-ID (optional) */
  userId?: string;
  /** E-Mail-Adresse des Benutzers (optional) */
  userEmail?: string;
  /** IP-Adresse (optional) */
  ipAddress?: string;
  /** User-Agent (optional) */
  userAgent?: string;
  /** Session-ID (optional) */
  sessionId?: string;
  /** Beweise/Evidenz für den Alert */
  evidence?: Record<string, any>;
  /** Zusätzliche Metadaten */
  metadata?: Record<string, any>;
  /** Tags zur Kategorisierung */
  tags?: string[];
}

/**
 * Optionen für Alert-Abfragen
 */
export interface AlertQueryOptions {
  /** Zeitbereich für die Abfrage */
  timeRange?: {
    start: Date;
    end: Date;
  };
  /** Nach Benutzer-ID filtern */
  userId?: string;
  /** Nach IP-Adresse filtern */
  ipAddress?: string;
  /** Nach Schweregrad filtern */
  severity?: ThreatSeverity;
  /** Nach Alert-Typ filtern */
  type?: AlertType;
  /** Nach Status filtern */
  status?: string;
  /** Nach Tags filtern */
  tags?: string[];
  /** Nur korrelierte Alerts */
  correlatedOnly?: boolean;
  /** Pagination */
  skip?: number;
  take?: number;
  /** Sortierung */
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

/**
 * Alert-Statistiken
 */
export interface AlertStatistics {
  /** Gesamtanzahl der Alerts */
  total: number;
  /** Aufschlüsselung nach Schweregrad */
  bySeverity: Record<string, number>;
  /** Aufschlüsselung nach Typ */
  byType: Record<string, number>;
  /** Aufschlüsselung nach Status */
  byStatus: Record<string, number>;
  /** Zeitbereich der Statistik */
  timeRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Konfiguration für Alert-Korrelation
 */
export interface AlertCorrelationConfig {
  /** Zeitfenster für Korrelation in Millisekunden */
  timeWindow: number;
  /** Minimale Anzahl von Alerts für Korrelation */
  minAlerts: number;
  /** Felder die für Korrelation verwendet werden */
  correlationFields: string[];
  /** Automatische Eskalation bei Korrelation */
  autoEscalate: boolean;
  /** Eskalationsschwellwerte */
  escalationThresholds: {
    criticalCount: number;
    highCount: number;
    totalCount: number;
  };
}

/**
 * Konfiguration für Alert-Benachrichtigungen
 */
export interface AlertNotificationConfig {
  /** Aktivierte Channels für verschiedene Severity-Level */
  channelsBySeverity: {
    low: string[];
    medium: string[];
    high: string[];
    critical: string[];
  };
  /** Rate Limiting Konfiguration */
  rateLimiting: {
    /** Maximale Alerts pro Stunde pro Benutzer */
    maxPerHourPerUser: number;
    /** Maximale Alerts pro Stunde global */
    maxPerHourGlobal: number;
  };
  /** Retry-Konfiguration */
  retryConfig: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
  };
}
