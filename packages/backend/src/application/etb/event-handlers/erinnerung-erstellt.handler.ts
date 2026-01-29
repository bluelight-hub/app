/**
 * ETB-Eintrag Auto-Creation bei Erinnerung-Erstellung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Erinnerung-Erstellung
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Story 5.0:** Stub-Implementierung - vorerst nur Logging.
 * Full-Impl in Story 5.1 mit EtbKategorie.ERINNERUNG und Text-Templates.
 *
 * @module application/etb/event-handlers
 * @see ErinnerungErstelltEvent - Trigger Event (Domain Event via Outbox)
 */
import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ErinnerungErstelltEvent } from '@domain/events/erinnerung-erstellt.event';
import { LOGGER } from '@infrastructure/di-tokens';

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Erinnerung-Erstellung.
 *
 * **Story 5.0 - Stub-Implementierung:**
 * Loggt das Event vorerst nur. Die vollstaendige Implementierung
 * mit ETB-Eintrag-Erstellung erfolgt in Story 5.1.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Erinnerung-Erstellung wird NICHT blockiert bei ETB-Fehlern
 */
@Injectable()
export class ErinnerungErstelltEventHandler implements IEventHandler<ErinnerungErstelltEvent> {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  /**
   * Verarbeitet ErinnerungErstelltEvent.
   *
   * Story 5.0: Stub - loggt nur, erstellt keinen ETB-Eintrag.
   * Story 5.1: Wird erweitert um ETB-Eintrag mit Kategorie ERINNERUNG.
   *
   * @param event - Das empfangene ErinnerungErstelltEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: ErinnerungErstelltEvent): Promise<void> {
    this.logger.log(`[STUB] ErinnerungErstelltEvent received: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}`, 'ErinnerungErstelltEventHandler');

    // Story 5.1: Hier wird ETB-Eintrag mit Kategorie ERINNERUNG erstellt
    // Template: ERINNERUNG_ETB_TEMPLATES.ERSTELLT
  }
}
