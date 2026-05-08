import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { VorfallExportiertEvent } from '@domain/eigenschutz/events/vorfall-exportiert.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.vorfall_exportiert` (Story 5.6).
 *
 * Log-Adapter als 4-Stellen-Registry-Consumer. Audit-Quelle bleibt die Outbox.
 */
@Injectable()
export class EigenschutzVorfallExportiertEventAdapter {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  @OnEvent(VorfallExportiertEvent.eventName())
  async onVorfallExportiert(event: VorfallExportiertEvent): Promise<void> {
    this.logger.log('Received VorfallExportiertEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      userIdHash: redactId(event.userId),
      vorfallId: event.vorfallId,
      format: event.format,
      downloadedAt: event.downloadedAt.toISOString(),
      eventName: VorfallExportiertEvent.eventName(),
    });
  }
}
