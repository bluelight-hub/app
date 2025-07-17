export interface NotificationRecipient {
  email?: string;
  webhookUrl?: string;
  userId?: string;
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
