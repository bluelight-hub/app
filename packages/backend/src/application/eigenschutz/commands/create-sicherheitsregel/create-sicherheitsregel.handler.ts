import type { ILogger } from '@domain/ports/i-logger.port';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { Sicherheitsregel } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import type { ISicherheitsregelRepository } from '@domain/eigenschutz/repositories/i-sicherheitsregel.repository';
import type { ISicherheitsregelVersionRepository } from '@domain/eigenschutz/repositories/i-sicherheitsregel-version.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, SICHERHEITSREGEL_REPOSITORY, SICHERHEITSREGEL_VERSION_REPOSITORY } from '@infrastructure/di-tokens';
import { CreateSicherheitsregelCommand } from './create-sicherheitsregel.command';

/**
 * Sentinel-Error-Codes für den Create-Flow (Story 2.6 AC2). Der Controller
 * mappt die Präfixe deterministisch auf HTTP-Statuscodes (404 für
 * `NotFound:*`, 500 für `InfrastructureError:*`).
 */
export const CREATE_SICHERHEITSREGEL_ERROR_CODES = {
  EINHEIT_NOT_FOUND: 'NotFound:Einheit',
  INFRASTRUCTURE_ERROR: 'InfrastructureError:Eigenschutz',
} as const;

const RECOGNIZED_SENTINEL_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:', 'Invariant:'] as const;

function wrapInfrastructureError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${CREATE_SICHERHEITSREGEL_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`;
}

/**
 * Handler für `CreateSicherheitsregelCommand` (Story 2.6 AC2).
 *
 * **Transactional Flow:**
 * 1. Wenn `einheitIds` gesetzt → jede Einheit existiert UND gehört zum
 *    angegebenen Einsatz (AC-Einsatz-Scoping, NotFound:Einheit bei Verstoß).
 * 2. Ein `propagationGroupId` (cuid2) wird **einmal** pro Aufruf generiert
 *    und an alle Fanout-Rows gebunden (AC2).
 * 3. **Fanout:** Eine `Sicherheitsregel` pro Ziel erzeugen (`einheitIds=null`
 *    → eine Row mit `einheitId=null`; `einheitIds=[a, b, c]` → drei Rows).
 *    Jedes Aggregate emittiert ein eigenes `SicherheitsregelAusgerufenEvent`
 *    mit gemeinsamer `propagationGroupId`.
 * 4. Alle Aggregate + initialen Version-Zeilen atomar in derselben TX
 *    persistieren.
 * 5. Base-Handler schreibt alle Events zusammen in den Outbox.
 *
 * **Return-Typ:** `string[]` (IDs aller erzeugten Rows). Die Array-Form ist
 * bewusst gewählt, damit der Controller einheitlich fanout-aware antworten
 * kann — auch der Single-Row-Fall („einsatzweit") kommt als 1-Element-Array
 * zurück. Der Controller entscheidet das Response-Shape (AC6, Task 6).
 */
@Injectable()
@CommandHandler(CreateSicherheitsregelCommand)
export class CreateSicherheitsregelHandler extends TransactionalCommandHandler<CreateSicherheitsregelCommand, string[]> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SICHERHEITSREGEL_REPOSITORY)
    private readonly sicherheitsregelRepo: ISicherheitsregelRepository,
    @Inject(SICHERHEITSREGEL_VERSION_REPOSITORY)
    private readonly versionRepo: ISicherheitsregelVersionRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einheitRepo: IEinsatzEinheitRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: CreateSicherheitsregelCommand, tx: TransactionContext): Promise<Result<string[]> | { result: string[]; events: DomainEvent[] }> {
    // Step 1 — Einheiten-Validierung: alle Ziel-Einheiten müssen existieren
    // UND zum Einsatz gehören. Bei `einheitIds === null` ist kein Check nötig
    // (einsatzweit).
    if (command.einheitIds !== null) {
      for (const einheitId of command.einheitIds) {
        const einheitResult = await this.einheitRepo.findById(einheitId, tx);
        if (einheitResult.isFailure) {
          return Result.fail<string[]>(wrapInfrastructureError(einheitResult.error, 'Einheit konnte nicht geladen werden'));
        }
        const einheit = einheitResult.value;
        if (!einheit || einheit.einsatzId !== command.einsatzId) {
          return Result.fail<string[]>(CREATE_SICHERHEITSREGEL_ERROR_CODES.EINHEIT_NOT_FOUND);
        }
      }
    }

    // Step 2 — Gemeinsame Propagation-Gruppen-ID für alle Fanout-Rows.
    const propagationGroupId = createId();

    // Step 3 — Ziele bestimmen: null = eine einsatzweite Row, Array = Fanout.
    const targets: (string | null)[] = command.einheitIds === null ? [null] : command.einheitIds;

    const createdIds: string[] = [];
    const collectedEvents: DomainEvent[] = [];

    for (const einheitId of targets) {
      const aggregateResult = Sicherheitsregel.create({
        einsatzId: command.einsatzId,
        einheitId,
        titel: command.titel,
        inhalt: command.inhalt,
        erstelltVonUserId: command.createdBy,
        propagationGroupId,
      });
      if (aggregateResult.isFailure || !aggregateResult.value) {
        return Result.fail<string[]>(aggregateResult.error ?? 'Sicherheitsregel konnte nicht erstellt werden');
      }
      const aggregate = aggregateResult.value;

      const saveResult = await this.sicherheitsregelRepo.save(aggregate, command.createdBy, tx);
      if (saveResult.isFailure) {
        return Result.fail<string[]>(wrapInfrastructureError(saveResult.error, 'Sicherheitsregel konnte nicht gespeichert werden'));
      }

      const events = aggregate.getDomainEvents();
      const ausgerufenEvent = events.find((event) => event instanceof SicherheitsregelAusgerufenEvent) as SicherheitsregelAusgerufenEvent | undefined;
      if (!ausgerufenEvent) {
        return Result.fail<string[]>('SicherheitsregelAusgerufenEvent fehlt nach create');
      }

      const versionResult = await this.versionRepo.saveInitialVersion(
        {
          regelId: aggregate.id.value,
          version: aggregate.version,
          titel: aggregate.titel,
          inhalt: aggregate.inhalt,
          gueltigVon: ausgerufenEvent.occurredAt,
          changedByUserId: command.createdBy,
          eventId: ausgerufenEvent.eventId,
        },
        tx,
      );
      if (versionResult.isFailure) {
        return Result.fail<string[]>(wrapInfrastructureError(versionResult.error, 'Initiale Version konnte nicht gespeichert werden'));
      }

      createdIds.push(aggregate.id.value);
      collectedEvents.push(...events);
    }

    this.logger.log('Sicherheitsregel(n) erstellt', {
      einsatzId: command.einsatzId,
      propagationGroupId,
      fanoutSize: createdIds.length,
      einsatzweit: command.einheitIds === null,
      regelIds: createdIds,
    });

    return { result: createdIds, events: collectedEvents };
  }
}
