import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.psa_profil_geaendert` (Story 3.1 AC2/AC3 Echtzeit).
 *
 * **Verhalten:**
 * 1. Strukturierter Log mit PII-Redaction (Hashing für einsatz/user/einheit-IDs).
 * 2. WebSocket-Broadcast an Room `einsatz:{einsatzId}` mit Channel
 *    `eigenschutz:psa-profil-geaendert`. Empfänger refetchen ihre PSA-Profile
 *    der betroffenen Einheit; die Begründung wird **bewusst nicht** im
 *    Broadcast mitgeschickt (Bandbreiten-Hygiene + DSGVO — Klarschrift-
 *    Begründung lädt der Empfänger nur über die authentifizierte Refetch-
 *    Query nach).
 *
 * **Resilienz:** Broadcast-Fehler werden geloggt, nicht durchgereicht. Das
 * Outbox-Event bleibt die Wahrheit; der Broadcast ist Best-Effort-Live-Push.
 *
 * **Idempotenz:** Empfänger-Hooks halten ein LRU-Cache über `eventId` und
 * verwerfen Doppel-Lieferungen — konsistent mit Story 2.7 Pattern.
 */
@Injectable()
export class EigenschutzPsaProfilGeaendertEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher: IEinsatzEventPublisher,
  ) {}

  @OnEvent(PsaProfilGeaendertEvent.eventName())
  async onPsaProfilGeaendert(event: PsaProfilGeaendertEvent): Promise<void> {
    this.logger.log('Received PsaProfilGeaendertEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: redactId(event.einheitId),
      userIdHash: redactId(event.userId),
      zuweisungId: event.zuweisungId,
      propagationGroupId: event.propagationGroupId,
      profil: event.profil,
      aktion: event.aktion,
      eventName: PsaProfilGeaendertEvent.eventName(),
    });

    try {
      await this.publisher.broadcast(event.einsatzId, 'eigenschutz:psa-profil-geaendert', {
        eventId: event.eventId,
        einsatzId: event.einsatzId,
        einheitId: event.einheitId,
        zuweisungId: event.zuweisungId,
        propagationGroupId: event.propagationGroupId,
        profil: event.profil,
        aktion: event.aktion,
        // userId redacted im Broadcast — Empfänger sind authentifizierte
        // WebSocket-Clients im Einsatz-Channel, brauchen aber keine
        // Klar-User-IDs (DSGVO-Hygiene, Konsistenz mit Logger und Story 2.7
        // Pattern). Wer für Audit den vollen Klar-User braucht, lädt das
        // Event aus der Outbox-History via authenticated Query.
        userIdHash: redactId(event.userId),
        occurredAt: event.occurredAt.toISOString(),
        // Begründung wird absichtlich NICHT im Broadcast mitgesendet — UI
        // refetcht über die authentifizierte Query.
      });
    } catch (error) {
      this.logger.warn('PsaProfilGeaendert-Broadcast fehlgeschlagen — Outbox-Event bleibt unangetastet', {
        eventId: event.eventId,
        zuweisungId: event.zuweisungId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
