import type { ILogger } from '@domain/ports/i-logger.port';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import { GefaehrdungsbeurteilungAktualisiertEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event';
import type { IGefaehrdungsbeurteilungRepository, IGefaehrdungsbeurteilungVersionRepository } from '@domain/eigenschutz/repositories';
import { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GEFAEHRDUNGSBEURTEILUNG_REPOSITORY, GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { UpdateGefaehrdungsbeurteilungItemsCommand } from './update-gefaehrdungsbeurteilung-items.command';

/**
 * Sentinel-Error-Codes, die der Controller auf HTTP-Status mappt. Der
 * Conflict-Sentinel kommt aus der Domain (Aggregate) und wird hier
 * weitergereicht; `ValidationFailed:` annotiert VO-Errors (leerer Titel etc.),
 * damit der Controller sie eindeutig als `ItemValidation`-422 rendert und
 * nicht als Catch-all-422 mit unerkannter Roh-Message (AC11, Story 2.3).
 */
export const UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES = {
  BEURTEILUNG_NOT_FOUND: 'NotFound:Beurteilung',
  CONFLICT_DETECTED: GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED,
  INFRASTRUCTURE_ERROR: 'InfrastructureError:Eigenschutz',
  VALIDATION_FAILED_PREFIX: 'ValidationFailed',
} as const;

/**
 * Prefix-Set für alle Sentinel-Fehler, die der Controller semantisch auf
 * spezifische HTTP-Statuscodes mappt (409, 404, 422, 500). Fehler **ohne**
 * einen dieser Prefixes kommen aus dem Infrastructure-Layer (Prisma, DB,
 * Transaktion) und werden vom Handler mit `InfrastructureError:` annotiert,
 * damit der Controller sie sauber auf HTTP 500 mappen kann, statt sie als
 * `ItemValidation`-422 zu verschleiern (echter DB-Ausfall ↛ 422).
 */
const RECOGNIZED_SENTINEL_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:', 'Invariant:'] as const;

function wrapInfrastructureError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`;
}

/**
 * Wandelt einen rohen VO-Error (z. B. „Titel ist erforderlich") in einen
 * `ValidationFailed:<message>`-Sentinel um. So kann der Controller den Fall
 * deterministisch auf HTTP 422 mit `rule: 'ItemValidation'` mappen, ohne auf
 * einen Catch-all angewiesen zu sein (AC11). VO-Errors kommen ohne Präfix
 * aus `GefaehrdungItem.create`; bereits-präfixte Errors (Aggregate-Sentinels
 * wie `BusinessRule:DuplicateItemId`) werden unverändert durchgereicht.
 */
function wrapValidationError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES.VALIDATION_FAILED_PREFIX}:${message}`;
}

/**
 * Hängt den aktuellen DB-Versionsstand als `:current=<n>`-Suffix an den
 * ConflictDetected-Sentinel an. So kann der Controller die HTTP-409-Response
 * mit `context.currentVersion + context.attemptedVersion` anreichern (AC10),
 * ohne eine separate Daten-Struktur durch den Result-Typ zu schleusen.
 */
function encodeConflictSentinel(currentVersion: number): string {
  return `${GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED}:current=${currentVersion}`;
}

/**
 * Zusatzkontext, den der Controller bei einem 409 in die Error-Response packt.
 * `currentVersion` entstammt dem `:current=<n>`-Suffix (siehe `encodeConflictSentinel`);
 * `attemptedVersion` reicht der Controller aus dem Request-Body durch.
 */
export interface ConflictDetectedContext {
  currentVersion: number;
  attemptedVersion: number;
}

/**
 * Handler für `UpdateGefaehrdungsbeurteilungItemsCommand` (Story 2.2).
 *
 * **Transactional Flow:**
 * 1. Aggregate per `findById` laden; fremde `einsatzId` ⇒ `NotFound:Beurteilung`.
 * 2. Neue Items als VOs rekonstruieren (Backend-Autorität für `risikoklasse`).
 * 3. `aggregate.updateItems(...)` — Optimistic-Concurrency-Check (409) und
 *    Version-Inkrement; emittiert `GefaehrdungsbeurteilungAktualisiertEvent`.
 * 4. Repo `updateItems` schreibt Aggregate zurück (items, version,
 *    aktualisiertVonUserId).
 * 5. Repo `saveNewVersion` hängt neue Version-Zeile an und schließt die
 *    Vorversion (`gueltigBis = eventOccurredAt`).
 * 6. Base-Handler persistiert die Events atomar über Outbox.
 */
@Injectable()
@CommandHandler(UpdateGefaehrdungsbeurteilungItemsCommand)
export class UpdateGefaehrdungsbeurteilungItemsHandler extends TransactionalCommandHandler<UpdateGefaehrdungsbeurteilungItemsCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(GEFAEHRDUNGSBEURTEILUNG_REPOSITORY)
    private readonly beurteilungRepo: IGefaehrdungsbeurteilungRepository,
    @Inject(GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY)
    private readonly versionRepo: IGefaehrdungsbeurteilungVersionRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: UpdateGefaehrdungsbeurteilungItemsCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // Step 1 — Aggregate laden + Cross-Einsatz-Check.
    const loadResult = await this.beurteilungRepo.findById(command.gefaehrdungsbeurteilungId, tx);
    if (loadResult.isFailure) {
      return Result.fail<string>(wrapInfrastructureError(loadResult.error, 'Beurteilung konnte nicht geladen werden'));
    }
    const aggregate = loadResult.value;
    if (!aggregate || aggregate.einsatzId !== command.einsatzId) {
      return Result.fail<string>(UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES.BEURTEILUNG_NOT_FOUND);
    }

    // Step 2 — Neue Items als VOs (Backend berechnet risikoklasse autoritativ).
    // Raw VO-Error wird mit `ValidationFailed:`-Präfix verpackt, damit der
    // Controller den Fall deterministisch (via Whitelist) auf 422 mapped.
    const newItems: GefaehrdungItem[] = [];
    for (const itemProps of command.items) {
      const itemResult = GefaehrdungItem.create(itemProps);
      if (itemResult.isFailure || !itemResult.value) {
        return Result.fail<string>(wrapValidationError(itemResult.error, 'Ungültiges Item'));
      }
      newItems.push(itemResult.value);
    }

    // Step 3 — Aggregate mutieren (inkrementiert Version, emittiert Event).
    // Bei ConflictDetected hängen wir `aggregate.version` als `:current=<n>`
    // an, damit der 409-Context im Controller sowohl `currentVersion` als
    // auch `attemptedVersion` trägt (AC10).
    const updateResult = aggregate.updateItems(newItems, command.expectedVersion, command.userId);
    if (updateResult.isFailure) {
      const errorMessage = updateResult.error ?? 'Update fehlgeschlagen';
      if (errorMessage === GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED) {
        return Result.fail<string>(encodeConflictSentinel(aggregate.version));
      }
      return Result.fail<string>(errorMessage);
    }

    // Step 4 — Aggregate zurückschreiben. Repo kann DB-seitig einen
    // Lost-Update-Konflikt melden (zwei parallele TXs); in dem Fall reloaden
    // wir die aktuelle Version für den 409-Context (AC2 + AC10).
    const saveResult = await this.beurteilungRepo.updateItems(aggregate, command.userId, tx);
    if (saveResult.isFailure) {
      const saveError = saveResult.error ?? 'Beurteilung konnte nicht aktualisiert werden';
      if (saveError === GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED) {
        // Reload bewusst OHNE `tx`: eine frische Connection aus dem Prisma-
        // Pool liest den committed State des konkurrenten Writers unabhängig
        // vom Isolation-Level-Snapshot der Transaktion, die gleich rollbackt
        // (unter REPEATABLE READ / SERIALIZABLE würde `tx` den pre-conflict
        // Snapshot sehen und `aggregate.version - 1 === expectedVersion`
        // zurückgeben — Banner-Message wäre unsinnig).
        const reload = await this.beurteilungRepo.findById(command.gefaehrdungsbeurteilungId);
        if (reload.isSuccess && reload.value) {
          return Result.fail<string>(encodeConflictSentinel(reload.value.version));
        }
        // Reload fehlgeschlagen oder Aggregate zwischenzeitlich gelöscht —
        // wir liefern den Sentinel ohne `:current=<n>`-Suffix; der Controller
        // mappt 409 mit `currentVersion: undefined`, Frontend rendert den
        // Fallback-Text ohne konkrete Versionsnummer.
        this.logger.warn('Conflict-Reload nach DB-Level-409 fehlgeschlagen — 409 ohne currentVersion', {
          gefaehrdungsbeurteilungId: command.gefaehrdungsbeurteilungId,
          reloadError: reload.isFailure ? reload.error : 'aggregate-not-found',
        });
        return Result.fail<string>(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED);
      }
      return Result.fail<string>(wrapInfrastructureError(saveError, 'Beurteilung konnte nicht aktualisiert werden'));
    }

    // Step 5 — Version-Row anhängen + Vorversion schließen.
    const events = aggregate.getDomainEvents();
    const aktualisiertEvent = events.find((event) => event instanceof GefaehrdungsbeurteilungAktualisiertEvent) as GefaehrdungsbeurteilungAktualisiertEvent | undefined;
    if (!aktualisiertEvent) {
      return Result.fail<string>('GefaehrdungsbeurteilungAktualisiertEvent fehlt nach updateItems');
    }

    const versionResult = await this.versionRepo.saveNewVersion(
      {
        gefBeurteilungId: aggregate.id.value,
        version: aggregate.version,
        items: newItems,
        changedFields: aktualisiertEvent.changedFields as unknown as Record<string, unknown>,
        gueltigVon: aktualisiertEvent.occurredAt,
        changedByUserId: command.userId,
        eventId: aktualisiertEvent.eventId,
      },
      tx,
    );
    if (versionResult.isFailure) {
      return Result.fail<string>(wrapInfrastructureError(versionResult.error, 'Version-Row konnte nicht gespeichert werden'));
    }

    this.logger.log('Gefährdungsbeurteilung-Items aktualisiert', {
      gefaehrdungsbeurteilungId: aggregate.id.value,
      einsatzId: command.einsatzId,
      fromVersion: aktualisiertEvent.fromVersion,
      toVersion: aktualisiertEvent.toVersion,
      changedFields: aktualisiertEvent.changedFields,
    });

    return { result: aggregate.id.value, events };
  }
}
