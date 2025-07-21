/**
 * Konfigurationsinterface für das Auth-Modul
 *
 * Definiert alle konfigurierbaren Parameter für Authentifizierung,
 * Session-Management und Sicherheitsmechanismen.
 *
 * @interface AuthConfig
 * @example
 * ```typescript
 * const config: AuthConfig = {
 *   jwt: {
 *     secret: 'super-secret-key',
 *     accessTokenExpiry: '15m',
 *     refreshTokenExpiry: '7d'
 *   },
 *   loginAttempts: {
 *     maxAttempts: 5,
 *     windowMinutes: 15,
 *     lockoutDurationMinutes: 30,
 *     ipRateLimitAttempts: 20,
 *     ipRateLimitWindowMinutes: 60
 *   },
 *   session: {
 *     inactivityTimeoutMinutes: 30,
 *     maxConcurrentSessions: 5,
 *     heartbeatIntervalSeconds: 30
 *   },
 *   securityAlerts: {
 *     enabled: true,
 *     webhookUrl: 'https://api.example.com/webhooks/security',
 *     authToken: 'webhook-auth-token',
 *     thresholds: {
 *       suspiciousLoginRiskScore: 70,
 *       multipleFailedAttemptsWarning: 3
 *     }
 *   }
 * };
 * ```
 */
export interface AuthConfig {
  /**
   * JWT-Token-Konfiguration
   * @property {object} jwt - Konfiguration für JSON Web Tokens
   */
  jwt: {
    /**
     * Geheimer Schlüssel für JWT-Signierung
     * @property {string} secret - Sollte aus Umgebungsvariable JWT_SECRET geladen werden
     */
    secret: string;

    /**
     * Gültigkeitsdauer für Access Tokens
     * @property {string} accessTokenExpiry - Zeit-String (z.B. '15m', '1h', '7d')
     */
    accessTokenExpiry: string;

    /**
     * Gültigkeitsdauer für Refresh Tokens
     * @property {string} refreshTokenExpiry - Zeit-String, sollte länger als accessTokenExpiry sein
     */
    refreshTokenExpiry: string;
  };

  /**
   * Konfiguration für Login-Versuche und Rate-Limiting
   * @property {object} loginAttempts - Schutz vor Brute-Force-Angriffen
   */
  loginAttempts: {
    /**
     * Maximale Anzahl von Login-Versuchen pro Benutzer
     * @property {number} maxAttempts - Anzahl der erlaubten Versuche innerhalb des Zeitfensters
     */
    maxAttempts: number;

    /**
     * Zeitfenster für Login-Versuche in Minuten
     * @property {number} windowMinutes - Nach dieser Zeit werden Zähler zurückgesetzt
     */
    windowMinutes: number;

    /**
     * Sperrzeit nach Überschreitung der maximalen Versuche
     * @property {number} lockoutDurationMinutes - Dauer der Account-Sperrung in Minuten
     */
    lockoutDurationMinutes: number;

    /**
     * Maximale Login-Versuche pro IP-Adresse
     * @property {number} ipRateLimitAttempts - IP-basiertes Rate-Limit
     */
    ipRateLimitAttempts: number;

    /**
     * Zeitfenster für IP-Rate-Limiting in Minuten
     * @property {number} ipRateLimitWindowMinutes - Nach dieser Zeit wird IP-Zähler zurückgesetzt
     */
    ipRateLimitWindowMinutes: number;
  };

  /**
   * Session-Management-Konfiguration
   * @property {object} session - Einstellungen für Benutzersitzungen
   */
  session: {
    /**
     * Timeout bei Inaktivität in Minuten
     * @property {number} inactivityTimeoutMinutes - Session wird nach dieser Zeit ohne Aktivität beendet
     */
    inactivityTimeoutMinutes: number;

    /**
     * Maximale gleichzeitige Sessions pro Benutzer
     * @property {number} maxConcurrentSessions - Älteste Session wird beendet bei Überschreitung
     */
    maxConcurrentSessions: number;

    /**
     * Heartbeat-Intervall für Session-Aktivität in Sekunden
     * @property {number} heartbeatIntervalSeconds - Intervall für Keep-Alive-Signale
     */
    heartbeatIntervalSeconds: number;
  };

  /**
   * Konfiguration für Sicherheitswarnungen
   * @property {object} securityAlerts - Einstellungen für Security Alert System
   */
  securityAlerts: {
    /**
     * Aktiviert/Deaktiviert Sicherheitswarnungen
     * @property {boolean} enabled - Hauptschalter für das Alert-System
     */
    enabled: boolean;

    /**
     * Webhook-URL für Alert-Benachrichtigungen
     * @property {string | null} webhookUrl - Endpoint für externe Benachrichtigungen
     */
    webhookUrl: string | null;

    /**
     * Authentifizierungs-Token für Webhook
     * @property {string | null} authToken - Bearer Token für Webhook-Authentifizierung
     */
    authToken: string | null;

    /**
     * Schwellenwerte für Sicherheitswarnungen
     * @property {object} thresholds - Konfigurierbare Grenzwerte
     */
    thresholds: {
      /**
       * Risiko-Score-Schwellenwert für verdächtige Logins
       * @property {number} suspiciousLoginRiskScore - Wert zwischen 0-100, Standard: 70
       */
      suspiciousLoginRiskScore: number;

      /**
       * Anzahl fehlgeschlagener Versuche für Warnung
       * @property {number} multipleFailedAttemptsWarning - Warnung wird bei Erreichen ausgelöst
       */
      multipleFailedAttemptsWarning: number;
    };
  };
}

/**
 * Standard-Konfigurationswerte für das Auth-Modul
 *
 * Diese Werte werden verwendet, wenn keine explizite Konfiguration
 * über Umgebungsvariablen bereitgestellt wird.
 */
export const defaultAuthConfig: AuthConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },
  loginAttempts: {
    maxAttempts: 5,
    windowMinutes: 15,
    lockoutDurationMinutes: 30,
    ipRateLimitAttempts: 20,
    ipRateLimitWindowMinutes: 60,
  },
  session: {
    inactivityTimeoutMinutes: 30,
    maxConcurrentSessions: 5,
    heartbeatIntervalSeconds: 30,
  },
  securityAlerts: {
    enabled: process.env.SECURITY_ALERTS_ENABLED === 'true',
    webhookUrl: process.env.SECURITY_ALERT_WEBHOOK_URL || null,
    authToken: process.env.SECURITY_ALERT_AUTH_TOKEN || null,
    thresholds: {
      suspiciousLoginRiskScore: 70,
      multipleFailedAttemptsWarning: 3,
    },
  },
};
