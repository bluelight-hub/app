import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KonfliktAufgeloestEvent } from '@domain/eigenschutz/events/konflikt-aufgeloest.event';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.konflikt_aufgeloest` (Story 3.10 AC6).
 *
 * **Verhalten:**
 * 1. Strukturierter Log mit PII-Redaction (`redactId` für einsatzId/einheitId/
 *    entityId/resolvedByUserId). `entityType`/`fieldPath`/`resolution` Klartext
 *    (kein PII).
 * 2. WebSocket-Broadcast an Room `einsatz:{einsatzId}` über Channel
 *    `eigenschutz:konflikt-aufgeloest`.
 *
 * **PII-Vertrag (Architektur §B5, identisch zu Story 3.9 KonfliktErkannt):**
 * `localPayload` ist im `KonfliktAufgeloestEvent` nicht enthalten und wird
 * folglich auch nicht ausgeliefert. Die Liste-UI lädt vollständige Daten via
 * `GET /sync-conflicts` mit Permission-Check nach.
 *
 * Sichtbarkeits-Filter clientseitig: alle Empfänger im Einsatz erhalten den
 * Frame; nur User mit `eigenschutz:psa:write` (Pattern Story 3.7/3.9
 * BEFEHLSGEBER-Gating) reagieren mit Cache-Invalidation und Auto-Dismiss
 * des Mikro-Banners aus Story 3.9.
 *
 * **Resilienz:** Broadcast-Fehler werden geloggt, nicht durchgereicht — das
 * Outbox-Event ist die Wahrheit, der Broadcast ist Best-Effort-Live-Push.
 */
@Injectable()
export class EigenschutzKonfliktAufgeloestEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher: IEinsatzEventPublisher,
  ) {}

  @OnEvent(KonfliktAufgeloestEvent.eventName())
  async onKonfliktAufgeloest(event: KonfliktAufgeloestEvent): Promise<void> {
    this.logger.log('Received KonfliktAufgeloestEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: event.einheitId ? redactId(event.einheitId) : null,
      entityIdHash: redactId(event.entityId),
      resolvedByUserIdHash: redactId(event.userId),
      syncConflictIdHash: redactId(event.syncConflictId),
      entityType: event.entityType,
      fieldPath: event.fieldPath,
      resolution: event.resolution,
      eventName: KonfliktAufgeloestEvent.eventName(),
    });

    try {
      await this.publisher.broadcast(event.einsatzId, 'eigenschutz:konflikt-aufgeloest', {
        eventId: event.eventId,
        einsatzId: event.einsatzId,
        einheitId: event.einheitId ?? null,
        syncConflictId: event.syncConflictId,
        entityType: event.entityType,
        entityId: event.entityId,
        fieldPath: event.fieldPath,
        resolution: event.resolution,
        resolvedAt: event.resolvedAt.toISOString(),
        resolvedByUserId: event.userId,
      });
    } catch (error) {
      this.logger.warn('KonfliktAufgeloest-Broadcast fehlgeschlagen — Outbox-Event bleibt unangetastet', {
        eventId: event.eventId,
        syncConflictIdHash: redactId(event.syncConflictId),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
