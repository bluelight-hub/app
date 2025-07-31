/**
 * Erweiterte Sicherheits-Event-Typen für das Queue-basierte Logging-System.
 * Diese erweitern die bestehenden SecurityEventType aus dem Auth-Modul.
 */

import { SecurityEventType } from '../../modules/auth/constants/auth.constants';

/**
 * Erweiterte Sicherheits-Event-Typen für spezielle Queue-Events
 * Diese erweitern die bestehenden SecurityEventType aus dem Auth-Modul.
 *
 * @enum {string}
 */
export enum SecurityEventTypeExtended {
  // Neue Events für Queue-System
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  DATA_ACCESS = 'DATA_ACCESS',
  API_RATE_LIMIT = 'API_RATE_LIMIT',

  // Queue-spezifische Events
  QUEUE_JOB_FAILED = 'QUEUE_JOB_FAILED',
  QUEUE_JOB_COMPLETED = 'QUEUE_JOB_COMPLETED',
  QUEUE_JOB_RETRY = 'QUEUE_JOB_RETRY',
}

/**
 * Union Type für alle Security Event Types
 */
export type AllSecurityEventTypes = SecurityEventType | SecurityEventTypeExtended;

/**
 * Interface für Security Log Queue Job Daten
 */
export interface SecurityLogJobData {
  eventType: AllSecurityEventTypes;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  severity?: string;
  message?: string;
  timestamp?: Date;
}

/**
 * Job-Name Konstanten für BullMQ
 */
export const SECURITY_LOG_JOB_NAMES = {
  LOG_EVENT: 'log-security-event',
  BATCH_LOG: 'batch-log-events',
  CLEANUP: 'cleanup-old-logs',
  VERIFY_INTEGRITY: 'verify-log-integrity',
} as const;

/**
 * Queue-Konfigurationskonstanten
 */
export const SECURITY_LOG_QUEUE_CONFIG = {
  QUEUE_NAME: 'security-log',
  MAX_RETRIES: 3,
  BACKOFF_DELAY: 2000,
  BATCH_SIZE: 100,
  CLEANUP_INTERVAL_HOURS: 24,
  RETENTION_DAYS: 90,
} as const;
