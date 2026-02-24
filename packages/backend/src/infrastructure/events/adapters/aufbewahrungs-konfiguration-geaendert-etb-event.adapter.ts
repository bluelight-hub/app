/**
 * Infrastructure Event Adapter fuer AufbewahrungsKonfigurationGeaendert ETB Event Handling.
 *
 * Loggt Aenderungen an der DSGVO-Aufbewahrungskonfiguration als Audit-Trail.
 * Da dieses Event keinen Einsatz-Kontext hat (systemweite Konfiguration),
 * wird kein ETB-Eintrag erstellt, sondern nur ein strukturierter Audit-Log.
 *
 * @module infrastructure/events/adapters
 * @remarks Story 5.5 AC1
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ILogger } from '@domain/ports/i-logger.port';
import { AufbewahrungsKonfigurationGeaendertEvent } from '@domain/events/aufbewahrungs-konfiguration-geaendert.event';
import { LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter fuer AufbewahrungsKonfigurationGeaendert Audit-Logging.
 *
 * Empfaengt AufbewahrungsKonfigurationGeaendertEvents via @OnEvent Decorator
 * und erstellt einen strukturierten Audit-Log-Eintrag.
 *
 * HINWEIS: Kein Application-Layer Handler noetig, da dieses Event keinen
 * Einsatz-Kontext hat und somit keinen ETB-Eintrag erstellen kann.
 * Die Audit-Dokumentation erfolgt ueber strukturiertes Logging.
 */
@Injectable()
export class AufbewahrungsKonfigurationGeaendertEtbEventAdapter {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  @OnEvent(AufbewahrungsKonfigurationGeaendertEvent.eventName())
  async onKonfigurationGeaendert(event: AufbewahrungsKonfigurationGeaendertEvent): Promise<void> {
    const text = `Aufbewahrungsregeln geändert: Frist ${event.alteFristJahre}→${event.neueFristJahre} Jahre, Freigabe ${event.alteFreigabeperiodeTage}→${event.neueFreigabeperiodeTage} Tage, Auto-Löschen: ${event.automatischLoeschenAktiv ? 'aktiv' : 'inaktiv'}`;

    this.logger.log(text, {
      eventType: 'AufbewahrungsKonfigurationGeaendert',
      kategorie: 'ADMINISTRATION',
      alteFristJahre: event.alteFristJahre,
      neueFristJahre: event.neueFristJahre,
      alteFreigabeperiodeTage: event.alteFreigabeperiodeTage,
      neueFreigabeperiodeTage: event.neueFreigabeperiodeTage,
      automatischLoeschenAktiv: event.automatischLoeschenAktiv,
      geaendertVon: event.geaendertVon,
    });
  }
}
