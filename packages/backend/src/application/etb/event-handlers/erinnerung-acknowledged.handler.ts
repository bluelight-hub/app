/**
 * ETB-Eintrag Auto-Creation bei Erinnerung-Bestaetigung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Erinnerung-Bestaetigung
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 1.6 AC5):**
 * "Erinnerung '{titel}' bestaetigt"
 *
 * @module application/etb/event-handlers
 * @see ErinnerungAcknowledgedEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import type { ErinnerungAcknowledgedEvent } from '@domain/events/erinnerung-acknowledged.event';
import { IUserRepository } from '@domain/repositories/i-user.repository';
import { LOGGER, USER_REPOSITORY } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';
import { ERINNERUNG_ETB_TEMPLATES } from '@application/etb/constants';
import { UserId } from '@domain/value-objects/user-id';

/**
 * ETB Kategorie fuer Erinnerungen (Story 5.1 AC2).
 * Als Konstante definiert fuer bessere Wartbarkeit und Type-Safety.
 */
const ETB_KATEGORIE_ERINNERUNG: EtbKategorieValue = 'SYSTEM';

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Erinnerung-Bestaetigung.
 *
 * Verarbeitet ErinnerungAcknowledgedEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der Erinnerungsbestaetigung (Story 1.6 AC5).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Erinnerung-Acknowledge wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class ErinnerungAcknowledgedEventHandler implements IEventHandler<ErinnerungAcknowledgedEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Verarbeitet ErinnerungAcknowledgedEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene ErinnerungAcknowledgedEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: ErinnerungAcknowledgedEvent): Promise<void> {
    this.logger.log(`Creating ETB entry for ErinnerungAcknowledged: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}`, 'ErinnerungAcknowledgedEventHandler');

    try {
      // H3 Fix: Validierung aller required Fields (nicht nur titel)
      if (!event.titel || !event.acknowledgedBy || !event.erinnerungId || !event.einsatzId) {
        this.logger.error(
          `ErinnerungAcknowledged event has missing required fields: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, acknowledgedBy=${event.acknowledgedBy}`,
          'ErinnerungAcknowledgedEventHandler',
        );
        return; // Early exit - Event ist ungueltig
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId.toString();

      // Benutzernamen auflösen (Fallback auf UserId falls nicht gefunden)
      const personName = await this.resolveUserName(event.acknowledgedBy);

      // Story 5.1 AC2: Text fuer ETB-Eintrag via Template
      const text = ERINNERUNG_ETB_TEMPLATES.ACKNOWLEDGED.replace('{titel}', event.titel).replace('{person}', personName);

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.acknowledgedBy.toString(),
        ETB_KATEGORIE_ERINNERUNG,
        event.einsatzId.toString(),
        undefined, // absender - nicht relevant fuer automatische Eintraege
        undefined, // empfaenger - nicht relevant fuer automatische Eintraege
        {
          eventType: 'ErinnerungAcknowledged',
          erinnerungId: event.erinnerungId.toString(),
          acknowledgedAm: event.acknowledgedAm.toISOString(),
          acknowledgedBy: event.acknowledgedBy.toString(),
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for ErinnerungAcknowledged: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'ErinnerungAcknowledgedEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausfuehren via injiziertem Handler
      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for ErinnerungAcknowledged: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'ErinnerungAcknowledgedEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for ErinnerungAcknowledged: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}`, 'ErinnerungAcknowledgedEventHandler');
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen fuer Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for ErinnerungAcknowledged: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'ErinnerungAcknowledgedEventHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }

  /**
   * Loest den Benutzernamen fuer eine UserId auf.
   * Fallback auf UserId.toString() falls User nicht gefunden wird.
   *
   * @param userId - Die aufzuloesende UserId
   * @returns Benutzername oder UserId als String
   */
  private async resolveUserName(userId: UserId): Promise<string> {
    try {
      const result = await this.userRepository.findById(userId);

      if (result.isFailure) {
        // Repository-Fehler (DB-Problem, etc.) - loggen aber nicht crashen
        this.logger.warn(`Failed to resolve username for userId=${userId.toString()}: ${result.error}, using fallback`, 'ErinnerungAcknowledgedEventHandler');
        return userId.toString();
      }

      if (result.value) {
        // Defensive null check auf username
        return result.value.username?.value ?? userId.toString();
      }

      // User nicht gefunden - Fallback auf UserId (kein Log noetig)
      return userId.toString();
    } catch (error) {
      // Unerwartete Exception - loggen und Fallback
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Unexpected error resolving username for userId=${userId.toString()}: ${errorMessage}, using fallback`, 'ErinnerungAcknowledgedEventHandler');
      return userId.toString();
    }
  }
}
