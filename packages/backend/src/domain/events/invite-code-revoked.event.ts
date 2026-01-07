import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event das auftritt wenn ein InviteCode widerrufen wurde.
 * Repräsentiert historische Tatsache (Past Tense: "Revoked", nicht "Revoke").
 *
 * Dieses Event wird nach erfolgreichem Widerruf ausgelöst,
 * um andere Module (z.B. Audit Log, Admin Notifications) zu benachrichtigen.
 *
 * **Security Note:**
 * Der Code wird maskiert geloggt, um Missbrauch zu verhindern.
 *
 * @example
 * ```typescript
 * const event = new InviteCodeRevokedEvent(
 *   'invite_code_123',
 *   'ABC1****', // maskiert
 *   new Date(),
 *   'admin_456'
 * );
 * console.log(InviteCodeRevokedEvent.eventName()); // "invite_code.revoked"
 * ```
 */
export class InviteCodeRevokedEvent extends DomainEvent {
  /**
   * Constructor für InviteCodeRevokedEvent.
   *
   * @param inviteCodeId - ID des widerrufenen InviteCodes (Aggregate Root ID)
   * @param codeMasked - Maskierter Code für Audit-Logging (z.B. "ABC1****")
   * @param revokedAt - Zeitpunkt des Widerrufs
   * @param revokedById - ID des Users der den Code widerrufen hat
   */
  constructor(
    public readonly inviteCodeId: string,
    public readonly codeMasked: string,
    public readonly revokedAt: Date,
    public readonly revokedById: string,
  ) {
    super(inviteCodeId);
  }

  /**
   * Static Event Name für type-safe Event Routing.
   */
  static eventName(): string {
    return EVENT_NAMES.INVITE_CODE.REVOKED;
  }
}
