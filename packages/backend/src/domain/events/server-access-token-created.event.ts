import { DomainEvent } from '@domain/common/domain-event';
import type { AccessTokenId } from '@domain/value-objects/access-token-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event das auftritt wenn ein neues ServerAccessToken erstellt wurde.
 * Repräsentiert historische Tatsache (Past Tense: "Created", nicht "Create").
 *
 * Dieses Event wird nach erfolgreicher Token-Erstellung ausgelöst, um andere
 * Module (z.B. Audit Log, Security Monitoring) zu benachrichtigen.
 *
 * **Security Note:**
 * Dieses Event enthält NICHT den Token-Hash oder das Klartext-Token.
 * Nur die Token-ID und Metadaten für Audit-Zwecke.
 *
 * @example
 * ```typescript
 * const event = new ServerAccessTokenCreatedEvent(
 *   tokenId,
 *   'HiOrg Integration',
 *   expiresAt
 * );
 * console.log(ServerAccessTokenCreatedEvent.eventName()); // "server_access_token.created"
 * ```
 */
export class ServerAccessTokenCreatedEvent extends DomainEvent {
  /**
   * Constructor für ServerAccessTokenCreatedEvent.
   *
   * @param tokenId - Type-Safe ID des erstellten Tokens (Aggregate Root ID)
   * @param name - Optionaler Name des Tokens
   * @param expiresAt - Optionales Ablaufdatum
   * @param aggregateId - Optional: ID der Aggregate Root (für Event Store Context)
   */
  constructor(
    public readonly tokenId: AccessTokenId,
    public readonly name: string | null,
    public readonly expiresAt: Date | null,
    aggregateId?: string,
  ) {
    super(aggregateId ?? tokenId.toString());
  }

  /**
   * Static Event Name für type-safe Event Routing.
   */
  static eventName(): string {
    return EVENT_NAMES.SERVER_ACCESS_TOKEN.CREATED;
  }
}
