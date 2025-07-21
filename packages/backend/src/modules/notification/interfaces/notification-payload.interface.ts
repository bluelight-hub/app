/**
 * Empfängerinformationen für Benachrichtigungen
 *
 * @interface NotificationRecipient
 */
export interface NotificationRecipient {
  /** E-Mail-Adresse des Empfängers */
  email?: string;
  /** Webhook-URL für externe Systeme */
  webhookUrl?: string;
  /** Benutzer-ID für interne Referenzen */
  userId?: string;
  /** Zusätzliche empfängerspezifische Metadaten */
  metadata?: Record<string, any>;
}

export interface NotificationPayload {
  /**
   * Channel to send through (email, webhook, etc.)
   */
  channel: string;

  /**
   * Empfänger-Informationen
   */
  recipient: NotificationRecipient;

  /**
   * Betreff (für Email)
   */
  subject: string;

  /**
   * Template information
   */
  templates?: {
    html?: string;
    text?: string;
  };

  /**
   * Data for template rendering
   */
  data: Record<string, any>;

  /**
   * Priority
   */
  priority?: string;

  /**
   * Zusätzliche Metadaten
   */
  metadata?: Record<string, any>;
}
