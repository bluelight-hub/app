import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { SicherungspostenEingerichtetEvent } from '@domain/eigenschutz/events/sicherungsposten-eingerichtet.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.sicherungsposten_eingerichtet` (Story 4.1).
 *
 * Story 4.1 liefert bewusst nur einen Log-Handler — die echten Konsumenten
 * sind Story 4.3 (MapGL-Marker-Layer-Live-Update) und die Telemetrie-
 * Pipeline (Epic 7). Der `Eigenschutz*`-PascalCase-Präfix ist Pflicht für die
 * 4-Stellen-Registry-Konsistenz-Spec (Story 1.7 AC4).
 */
@Injectable()
export class EigenschutzSicherungspostenEingerichtetEventAdapter {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  @OnEvent(SicherungspostenEingerichtetEvent.eventName())
  async onSicherungspostenEingerichtet(event: SicherungspostenEingerichtetEvent): Promise<void> {
    this.logger.log('Received SicherungspostenEingerichtetEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: redactId(event.einheitId),
      userIdHash: redactId(event.userId),
      sicherungspostenId: event.sicherungspostenId,
      bezeichnungLength: event.bezeichnung.length,
      standortKind: event.standortKind,
      personalCount: event.personalCount,
      eventName: SicherungspostenEingerichtetEvent.eventName(),
    });
  }
}
