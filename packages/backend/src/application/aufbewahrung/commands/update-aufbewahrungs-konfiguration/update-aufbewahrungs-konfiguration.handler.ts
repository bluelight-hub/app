import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common';
import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import { AufbewahrungsKonfigurationGeaendertEvent } from '@domain/events/aufbewahrungs-konfiguration-geaendert.event';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IAufbewahrungsKonfigurationRepository } from '@/application/aufbewahrung/ports/i-aufbewahrungs-konfiguration.repository';
import { AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY } from '@infrastructure/di-tokens';
import { UpdateAufbewahrungsKonfigurationCommand } from './update-aufbewahrungs-konfiguration.command';

/**
 * Handler fuer UpdateAufbewahrungsKonfigurationCommand.
 *
 * Aktualisiert die DSGVO-Aufbewahrungskonfiguration und emittiert
 * AufbewahrungsKonfigurationGeaendertEvent fuer den ETB-Audit-Trail.
 *
 * @remarks Story 5.5 AC1
 */
@Injectable()
export class UpdateAufbewahrungsKonfigurationHandler extends TransactionalCommandHandler<UpdateAufbewahrungsKonfigurationCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY)
    private readonly konfigurationRepository: IAufbewahrungsKonfigurationRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: UpdateAufbewahrungsKonfigurationCommand, tx: TransactionContext): Promise<Result<void> | { result: undefined; events: DomainEvent[] }> {
    // 1. Alte Konfiguration laden (fuer Event-Vergleich)
    const alteKonfigResult = await this.konfigurationRepository.find(tx);
    if (alteKonfigResult.isFailure) {
      return Result.fail(alteKonfigResult.error ?? 'Konfiguration konnte nicht geladen werden');
    }
    const alteKonfig = alteKonfigResult.value ?? AufbewahrungsKonfiguration.default();

    // 2. Neue Konfiguration erstellen (mit Validierung)
    const neueKonfigResult = AufbewahrungsKonfiguration.create(command.aufbewahrungsfristJahre, command.freigabeperiodeTage, command.automatischLoeschenAktiv);
    if (neueKonfigResult.isFailure) {
      return Result.fail(neueKonfigResult.error ?? 'Ungültige Konfiguration');
    }
    const neueKonfig = neueKonfigResult.value as AufbewahrungsKonfiguration;

    // 3. Speichern
    const saveResult = await this.konfigurationRepository.save(neueKonfig, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Speichern fehlgeschlagen');
    }

    // 4. Event erstellen
    const event = new AufbewahrungsKonfigurationGeaendertEvent(
      alteKonfig.aufbewahrungsfristJahre,
      neueKonfig.aufbewahrungsfristJahre,
      alteKonfig.freigabeperiodeTage,
      neueKonfig.freigabeperiodeTage,
      neueKonfig.automatischLoeschenAktiv,
      command.geaendertVon,
    );

    return { result: undefined, events: [event] };
  }
}
