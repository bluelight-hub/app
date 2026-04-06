import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { GefahrenmatrixBewertung } from '@domain/gefahr/entities/gefahrenmatrix.entity';
import { GefahrenmatrixAktualisiertEvent } from '@domain/gefahr/events/gefahrenmatrix-aktualisiert.event';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import type { IGefahrenmatrixRepository } from '@domain/gefahr/repositories/i-gefahrenmatrix.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GEFAHRENMATRIX_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { UpdateGefahrenmatrixCommand } from './update-gefahrenmatrix.command';
import type { GefahrenmatrixBewertungDto } from '../../dto/gefahrenmatrix-response.dto';

@Injectable()
export class UpdateGefahrenmatrixHandler extends TransactionalCommandHandler<UpdateGefahrenmatrixCommand, GefahrenmatrixBewertungDto | null> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(GEFAHRENMATRIX_REPOSITORY)
    private readonly repository: IGefahrenmatrixRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: UpdateGefahrenmatrixCommand,
    _tx: TransactionContext,
  ): Promise<Result<GefahrenmatrixBewertungDto | null> | { result: GefahrenmatrixBewertungDto | null; events: DomainEvent[] }> {
    // Warnstufe KEINE → Bewertung entfernen
    if (command.warnstufe === Warnstufe.KEINE) {
      await this.repository.deleteByKey(command.einsatzId, command.gefahrentyp, command.schutzobjekt, _tx);
      this.logger.log(`Gefahrenmatrix-Bewertung entfernt (einsatzId: ${command.einsatzId}, typ: ${command.gefahrentyp}, objekt: ${command.schutzobjekt})`, 'UpdateGefahrenmatrixHandler');

      const event = new GefahrenmatrixAktualisiertEvent(command.einsatzId, command.gefahrentyp, command.schutzobjekt, Warnstufe.KEINE, command.aktualisiertVon);
      return { result: null, events: [event] };
    }

    // Bewertung erstellen/aktualisieren
    const bewertungResult = GefahrenmatrixBewertung.create({
      einsatzId: command.einsatzId,
      gefahrentyp: command.gefahrentyp,
      schutzobjekt: command.schutzobjekt,
      warnstufe: command.warnstufe,
      beschreibung: command.beschreibung,
      gemeldetVon: command.gemeldetVon,
      aktualisiertVon: command.aktualisiertVon,
    });

    if (bewertungResult.isFailure || !bewertungResult.value) {
      return Result.fail<GefahrenmatrixBewertungDto | null>(bewertungResult.error ?? 'GEFAHR_CREATION_FAILED');
    }

    const bewertung = bewertungResult.value;
    await this.repository.save(bewertung, _tx);

    this.logger.log(
      `Gefahrenmatrix-Bewertung gespeichert (einsatzId: ${command.einsatzId}, typ: ${command.gefahrentyp}, objekt: ${command.schutzobjekt}, stufe: ${command.warnstufe})`,
      'UpdateGefahrenmatrixHandler',
    );

    const events = bewertung.getDomainEvents();
    bewertung.clearDomainEvents();

    const dto: GefahrenmatrixBewertungDto = {
      id: bewertung.id.value,
      gefahrentyp: bewertung.gefahrentyp,
      schutzobjekt: bewertung.schutzobjekt,
      warnstufe: bewertung.warnstufe,
      beschreibung: bewertung.beschreibung,
      gemeldetVon: bewertung.gemeldetVon,
      updatedAt: bewertung.updatedAt,
    };

    return { result: dto, events };
  }
}
