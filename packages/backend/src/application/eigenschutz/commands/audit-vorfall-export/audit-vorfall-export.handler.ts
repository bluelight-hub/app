import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { VorfallExportiertEvent, type VorfallExportFormat } from '@domain/eigenschutz/events/vorfall-exportiert.event';
import type { IEigenschutzVorfallRepository } from '@domain/eigenschutz/repositories';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EIGENSCHUTZ_VORFALL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { AuditVorfallExportCommand } from './audit-vorfall-export.command';

const SUPPORTED_EXPORT_FORMATS: ReadonlySet<VorfallExportFormat> = new Set(['pdf', 'json']);

@Injectable()
@CommandHandler(AuditVorfallExportCommand)
export class AuditVorfallExportHandler extends TransactionalCommandHandler<AuditVorfallExportCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(EIGENSCHUTZ_VORFALL_REPOSITORY)
    private readonly vorfallRepo: IEigenschutzVorfallRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: AuditVorfallExportCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    if (!SUPPORTED_EXPORT_FORMATS.has(command.format)) {
      return Result.fail<string>(`ValidationFailed:VorfallExport:format=${command.format}:notSupported`);
    }
    if (!(command.downloadedAt instanceof Date) || Number.isNaN(command.downloadedAt.getTime())) {
      return Result.fail<string>('ValidationFailed:VorfallExport:downloadedAtInvalid');
    }

    const vorfallResult = await this.vorfallRepo.findById(command.vorfallId, tx);
    if (vorfallResult.isFailure) {
      return Result.fail<string>(vorfallResult.error ?? 'InfrastructureError:LoadVorfallForExportAudit');
    }
    const vorfall = vorfallResult.value;
    if (!vorfall || vorfall.einsatzId !== command.einsatzId) {
      return Result.fail<string>('NotFound:Vorfall');
    }

    const event = new VorfallExportiertEvent(command.einsatzId, command.exportedByUserId, command.vorfallId, command.format, command.downloadedAt);
    return { result: event.eventId, events: [event] };
  }
}
