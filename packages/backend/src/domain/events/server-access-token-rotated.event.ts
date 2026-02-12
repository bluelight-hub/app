import { DomainEvent } from '@domain/common/domain-event';
import { AccessTokenId } from '@domain/value-objects/access-token-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event das auftritt wenn ein ServerAccessToken rotiert wurde.
 * Repräsentiert historische Tatsache (Past Tense: "Rotated", nicht "Rotate").
 *
 * Bei einer Token-Rotation wird das alte Token widerrufen und ein neues
 * Token mit denselben Berechtigungen erstellt. Dieses Event erfasst beide
 * Token-IDs für vollständige Audit-Trail-Nachverfolgbarkeit.
 *
 * **Use Cases:**
 * - Security Audit Trail für Token-Lifecycle
 * - Compliance-Logging für Token-Rotation
 * - Benachrichtigung bei Token-Rotation (z.B. Security Alerts)
 *
 * **Security Note:**
 * Dieses Event enthält NICHT den Token-Hash oder das Klartext-Token.
 * Nur die Token-IDs und Metadaten für Audit-Zwecke.
 *
 * @example
 * ```typescript
 * const event = new ServerAccessTokenRotatedEvent(
 *   oldTokenId,
 *   newTokenId,
 *   rotatedAt,
 *   'admin@example.com'
 * );
 * console.log(ServerAccessTokenRotatedEvent.eventName()); // "server_access_token.rotated"
 * ```
 */
export class ServerAccessTokenRotatedEvent extends DomainEvent {
  /**
   * Constructor für ServerAccessTokenRotatedEvent.
   *
   * @param oldTokenId - Type-Safe ID des alten (widerrufenen) Tokens
   * @param newTokenId - Type-Safe ID des neuen (aktiven) Tokens
   * @param rotatedAt - Zeitpunkt der Rotation
   * @param rotatedBy - Optional: Benutzer der die Rotation durchgeführt hat
   * @param aggregateId - Optional: ID der Aggregate Root (für Event Store Context)
   */
  constructor(
    public readonly oldTokenId: AccessTokenId,
    public readonly newTokenId: AccessTokenId,
    public readonly rotatedAt: Date,
    public readonly rotatedBy?: string,
    aggregateId?: string,
  ) {
    super(aggregateId ?? newTokenId.toString());
  }

  /**
   * Static Event Name für type-safe Event Routing.
   */
  static eventName(): string {
    return EVENT_NAMES.SERVER_ACCESS_TOKEN.ROTATED;
  }
}
