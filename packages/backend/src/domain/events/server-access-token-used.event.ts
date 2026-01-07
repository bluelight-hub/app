import { DomainEvent } from '@domain/common/domain-event';
import type { AccessTokenId } from '@domain/value-objects/access-token-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event das auftritt wenn ein ServerAccessToken verwendet wurde.
 * Repräsentiert historische Tatsache (Past Tense: "Used", nicht "Use").
 *
 * Dieses Event wird bei jeder Token-Nutzung ausgelöst, um:
 * - Security Monitoring für ungewöhnliche Nutzungsmuster
 * - Audit Trail für Token-Nutzung
 * - Usage Analytics
 *
 * **Performance Note:**
 * Dieses Event kann häufig auftreten. Event Handler sollten
 * asynchron und performant implementiert sein.
 *
 * @example
 * ```typescript
 * const event = new ServerAccessTokenUsedEvent(tokenId);
 * console.log(ServerAccessTokenUsedEvent.eventName()); // "server_access_token.used"
 * ```
 */
export class ServerAccessTokenUsedEvent extends DomainEvent {
  /**
   * Constructor für ServerAccessTokenUsedEvent.
   *
   * @param tokenId - Type-Safe ID des verwendeten Tokens
   * @param usedAt - Zeitpunkt der Nutzung
   * @param aggregateId - Optional: ID der Aggregate Root (für Event Store Context)
   */
  constructor(
    public readonly tokenId: AccessTokenId,
    public readonly usedAt: Date,
    aggregateId?: string,
  ) {
    super(aggregateId ?? tokenId.toString());
  }

  /**
   * Static Event Name für type-safe Event Routing.
   */
  static eventName(): string {
    return EVENT_NAMES.SERVER_ACCESS_TOKEN.USED;
  }
}
