import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';

// Repositories
import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';

// Error Codes
import { ROLLEN_BESETZUNG_ERROR_CODES } from '@domain/kraefte/common/rollen-besetzung-error-codes';

// Command
import type { GebeRolleFreiCommand } from './gebe-rolle-frei.command';

/**
 * Handler für die Freigabe einer besetzten Führungsrolle.
 *
 * Implementiert das Soft-Delete Pattern: Setzt `freigegebenAm` statt physisches Löschen.
 * Fire-and-Forget ETB: Event wird emittiert, ETB-Handler erstellt Eintrag asynchron.
 *
 * **Story 5.2 - Acceptance Criteria:**
 * - AC1: Freigabe setzt freigegebenAm, emittiert RolleFreigegeben Event
 * - AC2: ETB-Eintrag wird durch Event Handler erstellt (Fire-and-Forget)
 * - AC3: Idempotenz - Doppelte Freigabe wird abgewiesen (BEREITS_FREIGEGEBEN)
 *
 * @see GebeRolleFreiCommand für Input-Validierung
 * @see RollenBesetzung.freigeben() für Domain Logic
 */
@Injectable()
export class GebeRolleFreiHandler extends TransactionalCommandHandler<GebeRolleFreiCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG)
    private readonly rollenBesetzungRepository: IRollenBesetzungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: GebeRolleFreiCommand, tx: TransactionContext): Promise<Result<void> | { result: undefined; events: DomainEvent[] }> {
    // 1. Lade RollenBesetzung
    const besetzungResult = await this.rollenBesetzungRepository.findById(command.rollenBesetzungId, tx);

    // Error Handling: Unterscheide DB Error (isFailure) von Not Found (ok(null))
    if (besetzungResult.isFailure) {
      this.logger.error(`DB Error beim Laden der RollenBesetzung ${command.rollenBesetzungId.value}: ${besetzungResult.error}`, 'GebeRolleFreiHandler');
      return Result.fail(besetzungResult.error ?? 'Datenbankfehler');
    }

    if (!besetzungResult.value) {
      return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND);
    }
    const besetzung = besetzungResult.value;

    // 2. Freigeben (Aggregate-Methode prüft BEREITS_FREIGEGEBEN)
    const freigebenResult = besetzung.freigeben(command.freigegebenVon);
    if (freigebenResult.isFailure) {
      return Result.fail(freigebenResult.error ?? ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN);
    }

    // 3. Speichern (Repository erkennt Update und nutzt toUpdatePersistence)
    const saveResult = await this.rollenBesetzungRepository.save(besetzung, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern');
    }

    this.logger.log(`Rolle ${besetzung.rollenName} freigegeben von ${command.freigegebenVon}`, 'GebeRolleFreiHandler');

    // 4. Events extrahieren (RolleFreigegeben Event)
    const events = besetzung.getDomainEvents();
    besetzung.clearDomainEvents();

    return { result: undefined, events };
  }
}
