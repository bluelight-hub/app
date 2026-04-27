import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { SicherheitsregelQuittiertEvent } from '@domain/eigenschutz/events/sicherheitsregel-quittiert.event';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.sicherheitsregel_quittiert`
 * (Story 2.7 AC6).
 *
 * **Verhalten:**
 * 1. Strukturierter Log mit PII-Redaction (`redactId` für ein-/userId/einheitId).
 * 2. WebSocket-Broadcast an Room `einsatz:{einsatzId}` mit Channel
 *    `sicherheitsregel:quittiert`. Empfänger:
 *    - Empfänger-Banner-Hook entfernt den Banner aus der Queue
 *    - Sender-Quittungsstand-Counter erhöht sich
 *
 * **Resilienz**: Broadcast-Fehler werden geloggt, nicht durchgereicht — das
 * Outbox-Event ist die Wahrheit, der Broadcast ist Best-Effort-Live-Push.
 *
 * **Payload-Diät:** Nur Felder, die Frontend-Consumer brauchen. `userId` ist
 * dabei, damit der Sender-Counter den quittierenden User benennen kann; der
 * Broadcast selbst ist nicht PII-frei (by design — Empfänger sind
 * authentifiziert per `EinsatzScopeGuard` auf dem WS-Gateway).
 */
@Injectable()
export class EigenschutzSicherheitsregelQuittiertEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher: IEinsatzEventPublisher,
  ) {}

  @OnEvent(SicherheitsregelQuittiertEvent.eventName())
  async onSicherheitsregelQuittiert(event: SicherheitsregelQuittiertEvent): Promise<void> {
    this.logger.log('Received SicherheitsregelQuittiertEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: redactId(event.einheitId),
      userIdHash: redactId(event.userId),
      sicherheitsregelId: event.regelId,
      propagationGroupId: event.propagationGroupId ?? null,
      quittiertAm: event.quittiertAm.toISOString(),
      eventName: SicherheitsregelQuittiertEvent.eventName(),
    });

    try {
      await this.publisher.broadcast(event.einsatzId, 'sicherheitsregel:quittiert', {
        eventId: event.eventId,
        regelId: event.regelId,
        einsatzId: event.einsatzId,
        einheitId: event.einheitId,
        propagationGroupId: event.propagationGroupId ?? null,
        userId: event.userId,
        quittiertAm: event.quittiertAm.toISOString(),
        occurredAt: event.occurredAt.toISOString(),
      });
    } catch (error) {
      this.logger.warn('SicherheitsregelQuittiert-Broadcast fehlgeschlagen — Outbox-Event bleibt unangetastet', {
        eventId: event.eventId,
        sicherheitsregelId: event.regelId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
