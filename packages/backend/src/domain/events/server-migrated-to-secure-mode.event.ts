import { DomainEvent } from '@domain/common/domain-event';
import type { AccessTokenId } from '@domain/value-objects/access-token-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event das auftritt wenn der Server von INSECURE zu SECURE Mode migriert wurde.
 * Repräsentiert historische Tatsache (Past Tense: "Migrated", nicht "Migrate").
 *
 * Dieses Event wird nach erfolgreicher Migration ausgelöst, um andere
 * Module (z.B. Audit Log, Security Monitoring) zu benachrichtigen.
 *
 * **Security Implications:**
 * - Nach diesem Event ist der Server im SECURE Mode
 * - Alle API-Calls benötigen nun einen gültigen Access Token
 * - Das Initial-Token wurde erstellt und ist das einzige aktive Token
 * - INSECURE Mode kann NICHT wieder aktiviert werden
 *
 * **Security Note:**
 * Dieses Event enthält NICHT den Token-Hash oder das Klartext-Token.
 * Nur die Token-ID und Metadaten für Audit-Zwecke.
 *
 * @example
 * ```typescript
 * const event = new ServerMigratedToSecureModeEvent(
 *   initialTokenId,
 *   'Admin Initial Token',
 *   new Date()
 * );
 * console.log(ServerMigratedToSecureModeEvent.eventName()); // "server_config.migrated_to_secure"
 * ```
 */
export class ServerMigratedToSecureModeEvent extends DomainEvent {
  /**
   * Constructor für ServerMigratedToSecureModeEvent.
   *
   * @param initialTokenId - Type-Safe ID des erstellten Initial-Tokens
   * @param tokenName - Name des Initial-Tokens
   * @param migratedAt - Zeitpunkt der Migration
   * @param aggregateId - Optional: ID der Aggregate Root (für Event Store Context)
   */
  constructor(
    public readonly initialTokenId: AccessTokenId,
    public readonly tokenName: string,
    public readonly migratedAt: Date,
    aggregateId?: string,
  ) {
    super(aggregateId ?? 'server_config_singleton');
  }

  /**
   * Static Event Name für type-safe Event Routing.
   */
  static eventName(): string {
    return EVENT_NAMES.SERVER_CONFIG.MIGRATED_TO_SECURE;
  }
}
