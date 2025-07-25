/**
 * Interface für Security Log Payload-Daten.
 * Definiert die Struktur der Daten, die an die Queue gesendet werden.
 */
export interface SecurityLogPayload {
  /**
   * Typ des Sicherheitsereignisses
   */
  eventType: string;

  /**
   * ID des betroffenen Benutzers (optional)
   */
  userId?: string;

  /**
   * IP-Adresse des Clients (optional)
   */
  ipAddress?: string;

  /**
   * User-Agent String des Clients (optional)
   */
  userAgent?: string;

  /**
   * Zusätzliche Metadaten für das Event (optional)
   */
  metadata?: Record<string, any>;
}
