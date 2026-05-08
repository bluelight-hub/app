import type { VorfallExportFormat } from '@domain/eigenschutz/events/vorfall-exportiert.event';

export class AuditVorfallExportCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly vorfallId: string,
    public readonly exportedByUserId: string,
    public readonly format: VorfallExportFormat,
    public readonly downloadedAt: Date,
  ) {}
}
