import { DomainEvent } from '../common/domain-event';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Ein Invite-Code wurde eingelöst.
 *
 * Wird emittiert wenn ein Client erfolgreich einen Invite-Code verwendet
 * um einen ServerAccessToken zu erhalten.
 */
export class InviteCodeUsedEvent extends DomainEvent {
  constructor(
    public readonly inviteCodeId: string,
    public readonly code: string,
    public readonly usedAt: Date,
    public readonly newUseCount: number,
  ) {
    super(inviteCodeId);
  }

  static eventName(): string {
    return EVENT_NAMES.INVITE_CODE.USED;
  }
}
