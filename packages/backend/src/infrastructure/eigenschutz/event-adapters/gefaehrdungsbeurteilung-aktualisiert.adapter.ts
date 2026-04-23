import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { GefaehrdungsbeurteilungAktualisiertEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.gefaehrdungsbeurteilung_aktualisiert`.
 *
 * Story 2.2 hält den Adapter bewusst als Log-Only (analog zum Erstellt-Adapter):
 * die Ampel-Projection (Epic 6.1) und Telemetrie (Epic 7) sind die eigentlichen
 * Consumer. Der Klassen-Name trägt den `Eigenschutz*`-Präfix, damit die
 * Konsistenz-Spec `eigenschutz-event-registry.spec.ts` die Registrierung über
 * den PascalCase-Heuristik-Match findet.
 */
@Injectable()
export class EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  @OnEvent(GefaehrdungsbeurteilungAktualisiertEvent.eventName())
  async onGefaehrdungsbeurteilungAktualisiert(event: GefaehrdungsbeurteilungAktualisiertEvent): Promise<void> {
    // PII-Redaction (DSGVO-Minimierung): einsatzId/einheitId/userId sind im
    // Kontext eines Einsatzes personenbeziehbar. Wir schreiben sie als
    // gehashte Short-IDs in Log-Aggregationen — Korrelation über Events
    // bleibt möglich, direkter Personenbezug aus dem Log nicht mehr.
    this.logger.log('Received GefaehrdungsbeurteilungAktualisiertEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: redactId(event.einheitId),
      userIdHash: redactId(event.userId),
      gefaehrdungsbeurteilungId: event.gefaehrdungsbeurteilungId,
      fromVersion: event.fromVersion,
      toVersion: event.toVersion,
      changedFields: event.changedFields,
      eventName: GefaehrdungsbeurteilungAktualisiertEvent.eventName(),
    });
  }
}
