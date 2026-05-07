import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { VorfallGemeldetEvent } from '@domain/eigenschutz/events/vorfall-gemeldet.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.vorfall_gemeldet` (Story 5.1).
 *
 * Story 5.1 liefert bewusst nur einen Log-Handler — die echten Konsumenten
 * sind Story 5.3 (Vorfall-Liste Live-Update) und die Telemetrie-Pipeline
 * (Epic 7). Der `Eigenschutz*`-PascalCase-Präfix ist Pflicht für die
 * 4-Stellen-Registry-Konsistenz-Spec (Story 1.7 AC4).
 *
 * **PII-Hygiene:** Logs enthalten keine Klartext-IDs (außer der nicht-PII
 * `vorfallId`); `einsatzId`, `einheitId`, `userId` werden via `redactId` auf
 * Hashes reduziert (Pattern Story 3.7/4.1).
 */
@Injectable()
export class EigenschutzVorfallGemeldetEventAdapter {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  @OnEvent(VorfallGemeldetEvent.eventName())
  async onVorfallGemeldet(event: VorfallGemeldetEvent): Promise<void> {
    this.logger.log('Received VorfallGemeldetEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: event.einheitId ? redactId(event.einheitId) : null,
      userIdHash: redactId(event.userId),
      vorfallId: event.vorfallId,
      unfallkasseRelevant: event.unfallkasseRelevant,
      eventName: VorfallGemeldetEvent.eventName(),
    });
  }
}
