import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { VorfallGeschlossenEvent } from '@domain/eigenschutz/events/vorfall-geschlossen.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.vorfall_geschlossen` (Issue #415).
 *
 * Aktuell ein Log-Adapter analog `EigenschutzVorfallGemeldetEventAdapter`.
 * Echte Konsumenten:
 * - `RecalculateAmpelProjectionOnEigenschutzEventHandler` (Application-Layer)
 * - Live-Updates der Vorfall-Liste (Frontend Tab GESCHLOSSEN)
 *
 * **PII-Hygiene:** `einsatzId`, `einheitId`, `userId` werden via `redactId`
 * auf Hashes reduziert; `vorfallId` ist nicht-PII (Pattern Story 5.1
 * VorfallGemeldetEventAdapter).
 */
@Injectable()
export class EigenschutzVorfallGeschlossenEventAdapter {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  @OnEvent(VorfallGeschlossenEvent.eventName())
  async onVorfallGeschlossen(event: VorfallGeschlossenEvent): Promise<void> {
    this.logger.log('Received VorfallGeschlossenEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: event.einheitId ? redactId(event.einheitId) : null,
      userIdHash: redactId(event.userId),
      vorfallId: event.vorfallId,
      geschlossenAt: event.geschlossenAm.toISOString(),
      eventName: VorfallGeschlossenEvent.eventName(),
    });
  }
}
