import { Session, SessionActivity, User } from '../../../../prisma/generated/prisma';

/**
 * Session mit zugehörigem Benutzer
 *
 * Erweitert die Standard-Session um vollständige Benutzerinformationen
 * @interface SessionWithUser
 * @extends {Session}
 */
export interface SessionWithUser extends Session {
  /** Der mit der Session verknüpfte Benutzer */
  user: User;
}

/**
 * Session mit Aktivitätsliste
 *
 * Erweitert die Standard-Session um eine Liste aller zugehörigen Aktivitäten
 * @interface SessionWithActivities
 * @extends {Session}
 */
export interface SessionWithActivities extends Session {
  /** Liste aller Aktivitäten innerhalb dieser Session */
  activities: SessionActivity[];
}

/**
 * Session mit vollständigen Details
 *
 * Erweitert die Standard-Session um Benutzerinformationen und Aktivitätsliste
 * @interface SessionWithDetails
 * @extends {Session}
 */
export interface SessionWithDetails extends Session {
  /** Der mit der Session verknüpfte Benutzer */
  user: User;
  /** Liste aller Aktivitäten innerhalb dieser Session */
  activities: SessionActivity[];
}

/**
 * Aggregierte Session-Metriken
 *
 * Statistische Auswertung von Sessions für Monitoring und Reporting
 * @interface SessionMetrics
 */
export interface SessionMetrics {
  /** Gesamtanzahl aller Sessions */
  totalSessions: number;
  /** Anzahl der aktuell aktiven Sessions */
  activeSessions: number;
  /** Anzahl der widerrufenen Sessions */
  revokedSessions: number;
  /** Anzahl der Sessions mit hohem Risiko */
  highRiskSessions: number;
  /** Durchschnittliche Session-Dauer in Minuten */
  averageSessionDuration: number;
  /** Durchschnittliche Anzahl Sessions pro Benutzer */
  sessionsPerUser: number;
}

/**
 * Geräte-Informationen aus User-Agent
 *
 * Extrahierte Informationen aus dem User-Agent String zur Geräteidentifikation
 * @interface DeviceInfo
 */
export interface DeviceInfo {
  /** Gerätetyp (z.B. 'desktop', 'mobile', 'tablet') */
  type: string;
  /** Browser-Name (z.B. 'Chrome', 'Firefox', 'Safari') */
  browser: string;
  /** Browser-Version */
  browserVersion: string;
  /** Betriebssystem (z.B. 'Windows', 'macOS', 'Linux') */
  os: string;
  /** Betriebssystem-Version */
  osVersion: string;
}

/**
 * Standort-Informationen basierend auf IP-Adresse
 *
 * Geografische Daten aus IP-Geolokalisierung für Sicherheitsanalysen
 * @interface LocationInfo
 */
export interface LocationInfo {
  /** Stadt des Standorts */
  city?: string;
  /** Land des Standorts */
  country?: string;
  /** Region/Bundesland des Standorts */
  region?: string;
  /** Zeitzone des Standorts */
  timezone?: string;
  /** GPS-Koordinaten des Standorts */
  coordinates?: {
    /** Breitengrad */
    latitude: number;
    /** Längengrad */
    longitude: number;
  };
}

/**
 * Risikofaktoren für Session-Bewertung
 *
 * Identifizierte Risikoindikatoren für die Sicherheitsbewertung einer Session
 * @interface SessionRiskFactors
 */
export interface SessionRiskFactors {
  /** Login von einem neuen Standort */
  newLocation: boolean;
  /** Login von einem neuen Gerät */
  newDevice: boolean;
  /** Login zu ungewöhnlicher Zeit */
  unusualTime: boolean;
  /** Schneller Standortwechsel erkannt */
  rapidLocationChange: boolean;
  /** Verdächtiger User-Agent String */
  suspiciousUserAgent: boolean;
  /** Hohe Anzahl fehlgeschlagener Login-Versuche */
  highFailedLoginCount: boolean;
  /** Limit gleichzeitiger Sessions erreicht */
  concurrentSessionLimit: boolean;
}

/**
 * Daten für Session-Heartbeat Updates
 *
 * Regelmäßige Lebenszeichen einer aktiven Session mit optionalen Aktivitätsdaten
 * @interface SessionHeartbeatData
 */
export interface SessionHeartbeatData {
  /** ID der Session für den Heartbeat */
  sessionId: string;
  /** Zeitstempel des Heartbeats */
  timestamp: Date;
  /** Optionale Aktivitätsinformationen */
  activity?: {
    /** Typ der Aktivität (z.B. 'page_view', 'api_call') */
    type: string;
    /** Betroffene Ressource */
    resource?: string;
    /** Zusätzliche Metadaten */
    metadata?: Record<string, any>;
  };
}

/**
 * WebSocket-Payload für Session-Events
 *
 * Struktur für Echtzeit-Benachrichtigungen über Session-Änderungen
 * @interface SessionWebSocketPayload
 */
export interface SessionWebSocketPayload {
  /** Typ des Session-Events */
  type: 'session_created' | 'session_updated' | 'session_terminated' | 'session_activity';
  /** Die betroffene Session mit Benutzerinformationen */
  session: SessionWithUser;
  /** Optionale Aktivitätsinformationen bei activity Events */
  activity?: SessionActivity;
}

/**
 * Event-Namen für Session-bezogene Ereignisse
 *
 * Verwendet für Event-Emitter und WebSocket-Kommunikation
 * @const
 */
export const SESSION_EVENTS = {
  /** Event wenn eine neue Session erstellt wird */
  SESSION_CREATED: 'session.created',
  /** Event wenn eine Session aktualisiert wird */
  SESSION_UPDATED: 'session.updated',
  /** Event wenn eine Session beendet wird */
  SESSION_TERMINATED: 'session.terminated',
  /** Event wenn eine Session-Aktivität stattfindet */
  SESSION_ACTIVITY: 'session.activity',
  /** Event wenn ein Sicherheitsrisiko erkannt wird */
  SESSION_RISK_DETECTED: 'session.risk.detected',
  /** Event für Session-Heartbeats */
  SESSION_HEARTBEAT: 'session.heartbeat',
} as const;

/**
 * Flags für verdächtige Session-Aktivitäten
 *
 * Werden zur Identifikation von Sicherheitsrisiken verwendet
 * @const
 */
export const SUSPICIOUS_FLAGS = {
  /** Login von einem neuen Standort */
  NEW_LOCATION: 'new_location',
  /** Login von einem neuen Gerät */
  NEW_DEVICE: 'new_device',
  /** Login zu ungewöhnlicher Zeit */
  UNUSUAL_TIME: 'unusual_time',
  /** Schneller Standortwechsel */
  RAPID_LOCATION_CHANGE: 'rapid_location_change',
  /** Verdächtiger User-Agent */
  SUSPICIOUS_USER_AGENT: 'suspicious_user_agent',
  /** Hohe Anzahl fehlgeschlagener Logins */
  HIGH_FAILED_LOGIN_COUNT: 'high_failed_login_count',
  /** Limit gleichzeitiger Sessions erreicht */
  CONCURRENT_SESSION_LIMIT: 'concurrent_session_limit',
  /** Wiederverwendung eines Tokens */
  TOKEN_REUSE: 'token_reuse',
  /** Abnormale Aktivitätsmuster */
  ABNORMAL_ACTIVITY: 'abnormal_activity',
} as const;

/**
 * Schwellenwerte für die Risikobewertung von Sessions
 *
 * Definiert ab welchem Score eine Session als niedrig/mittel/hoch/kritisch eingestuft wird
 * @const
 */
export const RISK_SCORE_THRESHOLDS = {
  /** Niedriges Risiko (0-29) */
  LOW: 0,
  /** Mittleres Risiko (30-59) */
  MEDIUM: 30,
  /** Hohes Risiko (60-79) */
  HIGH: 60,
  /** Kritisches Risiko (80-100) */
  CRITICAL: 80,
} as const;

/**
 * Typ für verdächtige Flags
 * @typedef {string} SuspiciousFlag
 */
export type SuspiciousFlag = (typeof SUSPICIOUS_FLAGS)[keyof typeof SUSPICIOUS_FLAGS];

/**
 * Typ für Session-Events
 * @typedef {string} SessionEvent
 */
export type SessionEvent = (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS];
