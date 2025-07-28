/**
 * Interface für Security Log Payload-Daten.
 * Definiert die Struktur der Daten, die an die Queue gesendet werden.
 */
export interface SecurityLogPayload {
  /**
   * Die ausgeführte Aktion (eventType im SecurityLog Model)
   */
  action: string;

  /**
   * ID des betroffenen Benutzers
   */
  userId: string;

  /**
   * IP-Adresse des Clients
   */
  ip: string;

  /**
   * HTTP-Methode (optional)
   */
  method?: string;

  /**
   * Request-Pfad (optional)
   */
  path?: string;

  /**
   * HTTP-Statuscode (optional)
   */
  statusCode?: number;

  /**
   * User-Agent String des Clients (optional)
   */
  userAgent?: string;

  /**
   * ID der Organisation (optional)
   */
  organizationId?: string;

  /**
   * ID des Tenants (optional)
   */
  tenantId?: string;

  /**
   * Zusätzliche Metadaten für das Event (optional)
   */
  metadata?: Record<string, any>;
}
