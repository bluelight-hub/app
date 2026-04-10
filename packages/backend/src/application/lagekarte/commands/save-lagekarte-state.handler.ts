import { Result } from '@domain/common/result';
import { ILagekarteStateRepository } from '@domain/repositories/i-lagekarte-state.repository';
import { IEventPublisher } from '@domain/services/ports/i-event-publisher.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LagekarteStateGeaendertEvent } from '@domain/events/lagekarte-state-geaendert.event';
import { LagekarteId } from '@domain/value-objects/lagekarte-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { SaveLagekarteStateCommand } from './save-lagekarte-state.command';
import { LAGEKARTE_STATE_REPOSITORY, EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';

/**
 * Handler für SaveLagekarteStateCommand.
 *
 * Orchestriert das Speichern des GeoJSON-Zeichnungs-States einer Lagekarte.
 * Ersetzt den direkten Repository-Zugriff im Legacy Controller und publiziert
 * ein LagekarteStateGeaendertEvent für Echtzeit-Benachrichtigungen (Issue #638).
 *
 * **Fire-and-Forget Event Publishing:**
 * Das Event dient zur Benachrichtigung anderer Systeme (ETB, Audit).
 * Die Echtzeit-Synchronisation läuft separat über WebSocket-Deltas.
 */
@Injectable()
@CommandHandler(SaveLagekarteStateCommand)
export class SaveLagekarteStateCommandHandler implements ICommandHandler<SaveLagekarteStateCommand, Result<void>> {
  constructor(
    @Inject(LOGGER)
    private readonly logger: ILogger,
    @Inject(LAGEKARTE_STATE_REPOSITORY)
    private readonly lagekarteStateRepository: ILagekarteStateRepository,
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(command: SaveLagekarteStateCommand): Promise<Result<void>> {
    this.logger.log(`Saving Lagekarte state for Einsatz ${command.einsatzId} by user ${command.userId}`, 'SaveLagekarteStateCommandHandler');

    // Step 1: Lagekarte anhand der Einsatz-ID laden
    const lagekarte = await this.lagekarteStateRepository.findByEinsatzId(command.einsatzId);
    if (!lagekarte) {
      this.logger.warn('Lagekarte not found during state save', {
        einsatzId: command.einsatzId,
        timestamp: new Date().toISOString(),
      });
      return Result.fail<void>('Lagekarte not found');
    }

    // Step 2: State aktualisieren
    await this.lagekarteStateRepository.updateState(lagekarte.id, command.state);
    this.logger.log(`Lagekarte ${lagekarte.id} state updated for Einsatz ${command.einsatzId}`, 'SaveLagekarteStateCommandHandler');

    // Step 3: Domain Event publizieren (für ETB, Audit, etc.)
    try {
      const lagekarteIdResult = LagekarteId.create(lagekarte.id);
      const einsatzIdResult = EinsatzId.create(command.einsatzId);
      const userIdResult = UserId.create(command.userId);

      if (lagekarteIdResult.isFailure || einsatzIdResult.isFailure || userIdResult.isFailure) {
        this.logger.warn('Could not create Value Objects for event publishing - skipping event', {
          lagekarteId: lagekarte.id,
          einsatzId: command.einsatzId,
        });
        return Result.ok();
      }

      const event = new LagekarteStateGeaendertEvent(lagekarteIdResult.value!, einsatzIdResult.value!, userIdResult.value!);

      await this.eventPublisher.publishAll([event]);
      this.logger.log(`LagekarteStateGeaendertEvent published for Lagekarte ${lagekarte.id}`, 'SaveLagekarteStateCommandHandler');
    } catch (error) {
      // Fire-and-Forget: Event-Publishing-Fehler dürfen State-Save nicht blockieren
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to publish LagekarteStateGeaendertEvent: ${errorMessage}`, 'SaveLagekarteStateCommandHandler');
    }

    return Result.ok();
  }
}
