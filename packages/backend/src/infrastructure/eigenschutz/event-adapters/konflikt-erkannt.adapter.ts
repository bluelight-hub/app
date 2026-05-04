import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KonfliktErkanntEvent } from '@domain/eigenschutz/events/konflikt-erkannt.event';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.konflikt_erkannt` (Story 3.9 AC6).
 *
 * **Verhalten:**
 * 1. Strukturierter Log mit PII-Redaction (`redactId` für einsatzId/einheitId/
 *    entityId/reportedByUserId). `entityType`/`fieldPath` Klartext (kein PII),
 *    `serverVersion`/`localExpectedVersion` als Zahlen.
 * 2. WebSocket-Broadcast an Room `einsatz:{einsatzId}` über Channel
 *    `eigenschutz:konflikt-erkannt`.
 *
 * **PII-Vertrag (Architektur §B5):** `localPayload` wird **bewusst nicht** im
 * WS-Frame ausgeliefert — er kann sensitive UI-Drafts (User-Notizen,
 * Begründungen) enthalten. Die volle Payload lebt nur in der `sync_conflicts`-
 * Row und im Outbox-Event; Story 3.10 (`ConflictResolutionList`) lädt sie via
 * `GET /sync-conflicts` mit Permission-Check nach.
 *
 * Sichtbarkeits-Filter clientseitig: alle Empfänger im Einsatz erhalten den
 * Frame; nur User mit `eigenschutz:psa:write` rendern den `warning`-Banner
 * (Pattern Story 3.7 BEFEHLSGEBER-Gating).
 *
 * **Resilienz:** Broadcast-Fehler werden geloggt, nicht durchgereicht — das
 * Outbox-Event ist die Wahrheit, der Broadcast ist Best-Effort-Live-Push.
 */
@Injectable()
export class EigenschutzKonfliktErkanntEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher: IEinsatzEventPublisher,
  ) {}

  @OnEvent(KonfliktErkanntEvent.eventName())
  async onKonfliktErkannt(event: KonfliktErkanntEvent): Promise<void> {
    this.logger.log('Received KonfliktErkanntEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: event.einheitId ? redactId(event.einheitId) : null,
      entityIdHash: redactId(event.entityId),
      reportedByUserIdHash: redactId(event.userId),
      entityType: event.entityType,
      fieldPath: event.fieldPath,
      serverVersion: event.serverVersion,
      localExpectedVersion: event.localExpectedVersion,
      eventName: KonfliktErkanntEvent.eventName(),
    });

    try {
      await this.publisher.broadcast(event.einsatzId, 'eigenschutz:konflikt-erkannt', {
        eventId: event.eventId,
        einsatzId: event.einsatzId,
        einheitId: event.einheitId ?? null,
        entityType: event.entityType,
        entityId: event.entityId,
        fieldPath: event.fieldPath,
        serverVersion: event.serverVersion,
        localExpectedVersion: event.localExpectedVersion,
        reportedByUserId: event.userId,
        occurredAt: event.occurredAt.toISOString(),
      });
    } catch (error) {
      this.logger.warn('KonfliktErkannt-Broadcast fehlgeschlagen — Outbox-Event bleibt unangetastet', {
        eventId: event.eventId,
        entityIdHash: redactId(event.entityId),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
