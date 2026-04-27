import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.sicherheitsregel_ausgerufen`
 * (Story 2.6 + 2.7 AC6).
 *
 * **Story 2.7 Erweiterung — Log-Only auf Live-Broadcast:**
 * Der Adapter behält den strukturierten Log mit PII-Redaction (DSGVO-
 * Minimierung) und ergänzt jetzt einen WebSocket-Broadcast an Room
 * `einsatz:{einsatzId}` (ADR-006). Empfänger sind alle Clients, die im
 * Einsatz authentifiziert sind — Banner-Hook im Frontend filtert auf die
 * eigene `einheitId` bzw. `einsatzweit === true`.
 *
 * **Payload-Diät** (AC6): Nur die Felder, die das Frontend zur Banner-
 * Anzeige bzw. Cache-Invalidation braucht. Voller `inhalt` wird via
 * `useSicherheitsregel(...)`-Refetch geholt — bewahrt Cache-Konsistenz und
 * reduziert WS-Payload-Größe.
 *
 * **Resilienz**: Ein Broadcast-Fehler bricht den Adapter nicht und wird
 * NICHT durchgereicht. Das Outbox-Event ist die Wahrheit; der Broadcast ist
 * Best-Effort-Live-Push.
 */
@Injectable()
export class EigenschutzSicherheitsregelAusgerufenEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher: IEinsatzEventPublisher,
  ) {}

  @OnEvent(SicherheitsregelAusgerufenEvent.eventName())
  async onSicherheitsregelAusgerufen(event: SicherheitsregelAusgerufenEvent): Promise<void> {
    // PII-Redaction (DSGVO-Minimierung): einsatzId/einheitId/userId sind im
    // Kontext eines Einsatzes personenbeziehbar. Wir schreiben sie als
    // gehashte Short-IDs in Log-Aggregationen — Korrelation über Events
    // bleibt möglich, direkter Personenbezug aus dem Log nicht.
    //
    // `titel` + `inhalt` sind Freitext-Felder, die einen Einsatz-Kontext
    // enthalten können; wir loggen den Titel mit defensivem Kürzen (max 80
    // Zeichen, in der DB sowieso die Obergrenze), den Inhalt aus DSGVO-
    // Sicht bewusst NICHT — Audit-Historie liegt im Versions-Stream, nicht
    // im Application-Log.
    this.logger.log('Received SicherheitsregelAusgerufenEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: redactId(event.einheitId),
      userIdHash: redactId(event.userId),
      sicherheitsregelId: event.regelId,
      propagationGroupId: event.propagationGroupId,
      fromVersion: event.fromVersion,
      toVersion: event.toVersion,
      changedFields: event.changedFields,
      titel: event.titel.slice(0, 80),
      eventName: SicherheitsregelAusgerufenEvent.eventName(),
    });

    // Broadcast — Live-Push an Empfänger im Einsatz (Story 2.7 AC6).
    // Payload trägt nur Banner-relevante Felder; voller Inhalt kommt aus
    // dem Frontend-Refetch über `useSicherheitsregel`.
    //
    // **`inhaltAnriss`** (Story 2.7 AC1, Code-Review-Decision 2): Der Banner
    // braucht einen Body (≤ 140 Zeichen). Wir liefern einen server-seitig
    // truncated Anriss mit. Der volle `inhalt` (DSGVO-relevanter Freitext)
    // bleibt aus dem Broadcast ausgeschlossen — der Anriss enthält dieselben
    // ersten 140 Zeichen wie der Detail-Refetch und ist damit nicht
    // sensibler als `titel`. Empfänger der Broadcast-Channel sind durch
    // EinsatzScopeGuard (auf dem WS-Gateway) bereits authentifiziert.
    const inhaltAnriss = event.inhalt.length > 140 ? `${event.inhalt.slice(0, 137)}…` : event.inhalt;
    try {
      await this.publisher.broadcast(event.einsatzId, 'sicherheitsregel:ausgerufen', {
        eventId: event.eventId,
        regelId: event.regelId,
        einsatzId: event.einsatzId,
        einheitId: event.einheitId ?? null,
        einsatzweit: event.einheitId === undefined,
        propagationGroupId: event.propagationGroupId,
        fromVersion: event.fromVersion,
        toVersion: event.toVersion,
        changedFields: event.changedFields,
        titel: event.titel.slice(0, 80),
        inhaltAnriss,
        occurredAt: event.occurredAt.toISOString(),
      });
    } catch (error) {
      this.logger.warn('SicherheitsregelAusgerufen-Broadcast fehlgeschlagen — Outbox-Event bleibt unangetastet', {
        eventId: event.eventId,
        sicherheitsregelId: event.regelId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
