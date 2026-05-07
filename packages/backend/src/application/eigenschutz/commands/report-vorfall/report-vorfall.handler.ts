import type { ILogger } from '@domain/ports/i-logger.port';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import type { IEigenschutzVorfallRepository } from '@domain/eigenschutz/repositories';
import { Beteiligter } from '@domain/eigenschutz/value-objects/beteiligter.vo';
import { Wo } from '@domain/eigenschutz/value-objects/wo.vo';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EIGENSCHUTZ_VORFALL_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { ReportVorfallCommand } from './report-vorfall.command';
import { KontextSnapshotBuilder } from '../../services/kontext-snapshot-builder';

/**
 * Handler für `ReportVorfallCommand` (Story 5.1, AC5).
 *
 * Transactional Flow:
 * 1. Application-Layer-Validation: Wo + Beteiligter VOs konstruieren (frühe
 *    Sentinels mit Index-Hint, Pattern Story 3.6 `MeldeLueckeHandler`).
 * 2. Aggregate `EigenschutzVorfall.create` (emittiert `VorfallGemeldetEvent`).
 *    `kontextSnapshot` ist in 5.1 immer `{}` — Story 5.2 ersetzt diesen
 *    Schritt durch einen `KontextSnapshotBuilder`.
 * 3. Repo `save` schreibt Aggregate-Row in derselben TX.
 * 4. Base-Handler persistiert Events atomar via Outbox.
 *
 * **Caller-Authorization:** läuft ausschließlich im Controller-Layer
 * (`EinsatzScopeGuard` + `PermissionsGuard` + `eigenschutz:vorfall:report`).
 * Kein Re-Check im Handler — Pattern Story 4.1 + 3.6.
 */
@Injectable()
@CommandHandler(ReportVorfallCommand)
export class ReportVorfallHandler extends TransactionalCommandHandler<ReportVorfallCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(EIGENSCHUTZ_VORFALL_REPOSITORY)
    private readonly vorfallRepo: IEigenschutzVorfallRepository,
    private readonly snapshotBuilder: KontextSnapshotBuilder,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: ReportVorfallCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    let wo: Wo | null = null;
    if (command.wo !== null) {
      const woResult = Wo.create(command.wo);
      if (woResult.isFailure || !woResult.value) {
        return Result.fail<string>(`ValidationFailed:Wo:${woResult.error ?? 'Wo ungültig'}`);
      }
      wo = woResult.value;
    }

    const beteiligteVOs: Beteiligter[] = [];
    for (let idx = 0; idx < command.beteiligte.length; idx += 1) {
      const props = command.beteiligte[idx];
      // eslint-disable-next-line typescript/no-non-null-assertion -- guarded by loop bounds
      const result = Beteiligter.create(props!);
      if (result.isFailure || !result.value) {
        return Result.fail<string>(`ValidationFailed:Beteiligter:idx=${idx}:${result.error ?? 'Beteiligter ungültig'}`);
      }
      beteiligteVOs.push(result.value);
    }

    // Story 5.2: Snapshot zur Vorfallzeit bauen — alle Reads laufen in
    // derselben TX wie der Insert (Architektur §B2 Z. 478).
    const snapshotResult = await this.snapshotBuilder.build({
      einsatzId: command.einsatzId,
      einheitId: command.einheitId,
      snapshotAt: command.vorfallZeit,
      tx,
    });
    if (snapshotResult.isFailure || !snapshotResult.value) {
      // Builder-Sentinels (`InfrastructureError:*`, `Invariant:*`) reichen wir
      // 1:1 durch — der Controller mappt sie auf 500 (Pattern Story 3.7).
      // Code-Review-Patch (P12): Fallback bekommt einen Sentinel-Prefix, damit
      // ein leerer Builder-Error nicht im Controller auf `rule: 'Unexpected'`
      // landet — das `KontextSnapshotBuilder:Empty`-Token signalisiert die
      // Defekt-Klasse für Forensics.
      return Result.fail<string>(snapshotResult.error ?? 'InfrastructureError:KontextSnapshotBuilder:Empty:KontextSnapshot konnte nicht gebaut werden');
    }
    const kontextSnapshot = snapshotResult.value;

    const aggregateResult = EigenschutzVorfall.create({
      einsatzId: command.einsatzId,
      einheitId: command.einheitId,
      vorfallZeit: command.vorfallZeit,
      wann: command.wann,
      was: command.was,
      wo,
      beteiligte: beteiligteVOs,
      massnahmen: command.massnahmen,
      unfallkasseRelevant: command.unfallkasseRelevant,
      erfasstVonUserId: command.erfasstVonUserId,
      kontextSnapshot,
    });
    if (aggregateResult.isFailure || !aggregateResult.value) {
      const aggError = aggregateResult.error ?? 'Aggregate konnte nicht erstellt werden';
      // BusinessRule:*-Sentinels (z. B. WallclockDriftTooLarge) reichen wir
      // unverändert durch, damit der Controller-Mapper den Sentinel-Namen ins
      // 422-Response-`rule`-Feld übernehmen kann (AC7-Vertrag).
      if (aggError.startsWith('BusinessRule:')) {
        return Result.fail<string>(aggError);
      }
      return Result.fail<string>(`ValidationFailed:Aggregate:${aggError}`);
    }
    const aggregate = aggregateResult.value;

    const saveResult = await this.vorfallRepo.save(aggregate, tx);
    if (saveResult.isFailure) {
      return Result.fail<string>(saveResult.error ?? 'Vorfall konnte nicht gespeichert werden');
    }

    this.logger.log('Eigenschutz-Vorfall gemeldet', {
      vorfallId: aggregate.id.value,
      einsatzId: command.einsatzId,
      einheitId: command.einheitId,
      unfallkasseRelevant: command.unfallkasseRelevant,
      kontextSnapshotSchemaVersion: 1,
      hasGefBeurteilungVersionId: aggregate.gefBeurteilungVersionId !== null,
    });

    return { result: aggregate.id.value, events: aggregate.getDomainEvents() };
  }
}
