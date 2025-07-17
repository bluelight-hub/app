import { NotificationPayload } from './notification-payload.interface';

export enum ChannelHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
}

export interface ChannelHealthInfo {
  status: ChannelHealthStatus;
  lastChecked: Date;
  message?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface NotificationChannel {
  /**
   * Eindeutiger Name des Channels
   */
  readonly name: string;

  /**
   * Sendet eine Benachrichtigung über diesen Channel
   */
  send(payload: NotificationPayload): Promise<void>;

  /**
   * Validiert die Channel-Konfiguration
   */
  validateConfig(): Promise<boolean>;

  /**
   * Gibt den aktuellen Gesundheitsstatus des Channels zurück
   */
  getHealthStatus(): Promise<ChannelHealthInfo>;

  /**
   * Prüft, ob der Channel aktiviert ist
   */
  isEnabled(): boolean;
}
