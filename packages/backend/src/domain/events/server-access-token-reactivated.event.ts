import { DomainEvent } from '@domain/common/domain-event';
import type { AccessTokenId } from '@domain/value-objects/access-token-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event das auftritt wenn ein ServerAccessToken reaktiviert wurde.
 * Repräsentiert historische Tatsache (Past Tense: "Reactivated", nicht "Reactivate").
 *
 * Dieses Event wird nach erfolgreicher Token-Reaktivierung ausgelöst, um:
 * - Audit Trail für Token-Lifecycle
 * - Security Alerts bei Reaktivierung von Tokens
 * - Cache-Invalidation für Token-Validation
 *
 * @example
 * ```typescript
 * const event = new ServerAccessTokenReactivatedEvent(tokenId, reactivatedAt);
 * console.log(ServerAccessTokenReactivatedEvent.eventName()); // "server_access_token.reactivated"
 * ```
 */
export class ServerAccessTokenReactivatedEvent extends DomainEvent {
  /**
   * Constructor für ServerAccessTokenReactivatedEvent.
   *
   * @param tokenId - Type-Safe ID des reaktivierten Tokens
   * @param reactivatedAt - Zeitpunkt der Reaktivierung
   * @param aggregateId - Optional: ID der Aggregate Root (für Event Store Context)
   */
  constructor(
    public readonly tokenId: AccessTokenId,
    public readonly reactivatedAt: Date,
    aggregateId?: string,
  ) {
    super(aggregateId ?? tokenId.toString());
  }

  /**
   * Static Event Name für type-safe Event Routing.
   */
  static eventName(): string {
    return EVENT_NAMES.SERVER_ACCESS_TOKEN.REACTIVATED;
  }
}
