import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { SicherungspostenAktualisiertEvent } from '@domain/eigenschutz/events/sicherungsposten-aktualisiert.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.sicherungsposten_aktualisiert` (Story 4.1).
 *
 * Log-Only-Adapter — analog zu Erstellt-Adapter. Liefert Diff-Set + Versionen
 * an Log-Aggregator; Detail-Konsumenten kommen mit Story 4.3 / Epic 7.
 */
@Injectable()
export class EigenschutzSicherungspostenAktualisiertEventAdapter {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  @OnEvent(SicherungspostenAktualisiertEvent.eventName())
  async onSicherungspostenAktualisiert(event: SicherungspostenAktualisiertEvent): Promise<void> {
    this.logger.log('Received SicherungspostenAktualisiertEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: redactId(event.einheitId),
      userIdHash: redactId(event.userId),
      sicherungspostenId: event.sicherungspostenId,
      fromVersion: event.fromVersion,
      toVersion: event.toVersion,
      changedFields: event.changedFields,
      eventName: SicherungspostenAktualisiertEvent.eventName(),
    });
  }
}
