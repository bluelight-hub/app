import { DomainEvent } from '@domain/common/domain-event';
import type { AccessTokenId } from '@domain/value-objects/access-token-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event das auftritt wenn ein ServerAccessToken widerrufen wurde.
 * Repräsentiert historische Tatsache (Past Tense: "Revoked", nicht "Revoke").
 *
 * Dieses Event wird nach erfolgreicher Token-Widerrufung ausgelöst, um:
 * - Security Alerts bei unerwarteten Widerrufen
 * - Audit Trail für Token-Lifecycle
 * - Cache-Invalidation für Token-Validation
 *
 * @example
 * ```typescript
 * const event = new ServerAccessTokenRevokedEvent(tokenId, revokedAt);
 * console.log(ServerAccessTokenRevokedEvent.eventName()); // "server_access_token.revoked"
 * ```
 */
export class ServerAccessTokenRevokedEvent extends DomainEvent {
  /**
   * Constructor für ServerAccessTokenRevokedEvent.
   *
   * @param tokenId - Type-Safe ID des widerrufenen Tokens
   * @param revokedAt - Zeitpunkt des Widerrufs
   * @param aggregateId - Optional: ID der Aggregate Root (für Event Store Context)
   */
  constructor(
    public readonly tokenId: AccessTokenId,
    public readonly revokedAt: Date,
    aggregateId?: string,
  ) {
    super(aggregateId ?? tokenId.toString());
  }

  /**
   * Static Event Name für type-safe Event Routing.
   */
  static eventName(): string {
    return EVENT_NAMES.SERVER_ACCESS_TOKEN.REVOKED;
  }
}
