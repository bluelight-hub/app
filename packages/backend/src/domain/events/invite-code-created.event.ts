import { DomainEvent } from '@domain/common/domain-event';
import type { InviteCodeId } from '@domain/value-objects/invite-code-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event das auftritt wenn ein neuer InviteCode erstellt wurde.
 * Repräsentiert historische Tatsache (Past Tense: "Created", nicht "Create").
 *
 * Dieses Event wird nach erfolgreicher InviteCode-Erstellung ausgelöst,
 * um andere Module (z.B. Audit Log, Admin Notifications) zu benachrichtigen.
 *
 * **Security Note:**
 * Der Code wird maskiert geloggt, um Missbrauch zu verhindern.
 *
 * @example
 * ```typescript
 * const event = new InviteCodeCreatedEvent(
 *   inviteCodeId,
 *   'ABC1****', // maskiert
 *   expiresAt,
 *   10,
 *   userId
 * );
 * console.log(InviteCodeCreatedEvent.eventName()); // "invite_code.created"
 * ```
 */
export class InviteCodeCreatedEvent extends DomainEvent {
  /**
   * Constructor für InviteCodeCreatedEvent.
   *
   * @param inviteCodeId - Type-Safe ID des erstellten InviteCodes (Aggregate Root ID)
   * @param codeMasked - Maskierter Code für Audit-Logging (z.B. "ABC1****")
   * @param expiresAt - Ablaufdatum des Codes
   * @param maxUses - Maximale Anzahl erlaubter Nutzungen
   * @param createdById - ID des Admins der den Code erstellt hat
   * @param label - Optionales Label für den Code
   */
  constructor(
    public readonly inviteCodeId: InviteCodeId,
    public readonly codeMasked: string,
    public readonly expiresAt: Date,
    public readonly maxUses: number,
    public readonly createdById: string,
    public readonly label: string | null = null,
  ) {
    super(inviteCodeId.toString());
  }

  /**
   * Static Event Name für type-safe Event Routing.
   */
  static eventName(): string {
    return EVENT_NAMES.INVITE_CODE.CREATED;
  }
}
