import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { GefaehrdungsbeurteilungErstelltEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-erstellt.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.gefaehrdungsbeurteilung_erstellt`.
 *
 * Story 2.1 liefert bewusst nur einen Log-Handler: die Plattform-Invariante
 * „4-Stellen-Registrierung" (Story 1.7) muss grün sein, aber die eigentliche
 * Ampel-Projection kommt erst in Epic 6.1. Der Klassen-Name trägt den
 * `Eigenschutz*`-Präfix, damit die Konsistenz-Spec
 * `eigenschutz-event-registry.spec.ts` die Registrierung über den PascalCase-
 * Heuristik-Match findet.
 */
@Injectable()
export class EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  @OnEvent(GefaehrdungsbeurteilungErstelltEvent.eventName())
  async onGefaehrdungsbeurteilungErstellt(event: GefaehrdungsbeurteilungErstelltEvent): Promise<void> {
    // PII-Redaction (DSGVO-Minimierung): siehe Kommentar im Aktualisiert-Adapter.
    this.logger.log('Received GefaehrdungsbeurteilungErstelltEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: redactId(event.einheitId),
      userIdHash: redactId(event.userId),
      gefaehrdungsbeurteilungId: event.gefaehrdungsbeurteilungId,
      vorlageId: event.vorlageId,
      itemCount: event.itemCount,
      eventName: GefaehrdungsbeurteilungErstelltEvent.eventName(),
    });
  }
}
