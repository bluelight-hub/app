/**
 * Gerätetypen für Session-Tracking
 *
 * Klassifizierung der verschiedenen Gerätetypen, von denen aus auf die
 * Anwendung zugegriffen wird. Wird für Sicherheitsanalysen und
 * gerätebasierte Einschränkungen verwendet.
 *
 * @enum {string}
 */
export enum DeviceType {
  /** Zugriff über mobile Geräte (Smartphones) */
  MOBILE = 'mobile',
  /** Zugriff über Desktop-Computer oder Laptops */
  DESKTOP = 'desktop',
  /** Zugriff über Tablets */
  TABLET = 'tablet',
  /** Gerätetyp konnte nicht identifiziert werden */
  UNKNOWN = 'unknown',
}

/**
 * Verfügbare Login-Methoden
 *
 * Definiert die verschiedenen Authentifizierungsmethoden, die für
 * die Anmeldung im System verwendet werden können.
 *
 * @enum {string}
 */
export enum LoginMethod {
  /** Traditionelle Passwort-Authentifizierung */
  PASSWORD = 'password',
  /** OAuth-basierte Authentifizierung (z.B. Google, GitHub) */
  OAUTH = 'oauth',
  /** Single Sign-On über Unternehmens-Identity-Provider */
  SSO = 'sso',
  /** Biometrische Authentifizierung (Fingerabdruck, Face-ID) */
  BIOMETRIC = 'biometric',
}

/**
 * Typen von Session-Aktivitäten
 *
 * Kategorisiert die verschiedenen Aktivitäten, die während einer
 * Session auftreten können. Wird für Audit-Logging und Verhaltensanalyse verwendet.
 *
 * @enum {string}
 */
export enum ActivityType {
  /** Benutzer-Login */
  LOGIN = 'login',
  /** Benutzer-Logout */
  LOGOUT = 'logout',
  /** Seitenaufruf im Frontend */
  PAGE_VIEW = 'page_view',
  /** API-Aufruf */
  API_CALL = 'api_call',
  /** Datenzugriff (Lesen) */
  DATA_ACCESS = 'data_access',
  /** Datenmodifikation (Schreiben/Ändern/Löschen) */
  DATA_MODIFICATION = 'data_modification',
  /** Sicherheitsrelevantes Ereignis */
  SECURITY_EVENT = 'security_event',
}
