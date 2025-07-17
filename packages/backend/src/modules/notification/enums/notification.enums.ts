/**
 * Enum für den Status einer Benachrichtigung im System
 *
 * Mögliche Werte:
 * - QUEUED: Benachrichtigung wurde in die Warteschlange eingereiht
 * - PROCESSING: Benachrichtigung wird gerade verarbeitet
 * - SENT: Benachrichtigung wurde erfolgreich gesendet
 * - FAILED: Benachrichtigung konnte nicht gesendet werden
 * - CANCELLED: Benachrichtigung wurde abgebrochen
 */
export enum NotificationStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Enum für die Priorität einer Benachrichtigung
 *
 * Bestimmt die Verarbeitungsreihenfolge und Retry-Verhalten:
 * - LOW: Niedrige Priorität, kann verzögert werden
 * - MEDIUM: Normale Priorität
 * - HIGH: Hohe Priorität, bevorzugte Verarbeitung
 * - CRITICAL: Kritische Benachrichtigungen, sofortige Verarbeitung
 */
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Enum für vordefinierte Template-Typen
 *
 * Definiert die verfügbaren Benachrichtigungs-Templates:
 * - SECURITY_ALERT: Allgemeine Sicherheitswarnung
 * - ACCOUNT_LOCKED: Account wurde gesperrt
 * - SUSPICIOUS_LOGIN: Verdächtiger Login-Versuch
 * - BRUTE_FORCE_ATTEMPT: Brute-Force-Angriff erkannt
 * - WELCOME: Willkommensnachricht für neue Benutzer
 * - PASSWORD_RESET: Passwort-Zurücksetzen-Anfrage
 * - EMAIL_VERIFICATION: E-Mail-Verifizierung
 */
export enum TemplateType {
  SECURITY_ALERT = 'SECURITY_ALERT',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  WELCOME = 'WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
}
