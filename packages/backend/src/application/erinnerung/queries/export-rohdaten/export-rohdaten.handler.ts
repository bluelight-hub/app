import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { ILogger } from '@domain/ports/i-logger.port';
import { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ERINNERUNG_REPOSITORY, LOGGER, CSV_EXPORT_SERVICE, JSON_EXPORT_SERVICE } from '@infrastructure/di-tokens';
import { ICsvExportService } from '../../ports/i-csv-export.service';
import { IJsonExportService } from '../../ports/i-json-export.service';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';
import type { ExportRohdatenQuery } from './export-rohdaten.query';
import type { ExportResult } from '../export-erinnerungen/export-erinnerungen.handler';

@Injectable()
export class ExportRohdatenHandler {
  constructor(
    @Inject(ERINNERUNG_REPOSITORY)
    private readonly erinnerungRepository: IErinnerungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
    @Inject(CSV_EXPORT_SERVICE)
    private readonly csvService: ICsvExportService,
    @Inject(JSON_EXPORT_SERVICE)
    private readonly jsonService: IJsonExportService,
  ) {}

  async execute(query: ExportRohdatenQuery): Promise<Result<ExportResult>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<ExportResult>(einsatzIdResult.error ?? ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    const exportResult = await this.erinnerungRepository.getErinnerungenForRawExport(einsatzIdResult.value);
    if (exportResult.isFailure) {
      this.logger.error(`Failed to load erinnerungen for raw export: ${exportResult.error}`, 'ExportRohdatenHandler');
      return Result.fail<ExportResult>(exportResult.error ?? ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    // eslint-disable-next-line typescript/no-non-null-assertion -- Result.value ist nach isFailure-Check garantiert
    const erinnerungen = exportResult.value!;
    const einsatzNummer = query.einsatzNummer;

    try {
      let buffer: Buffer;
      let contentType: string;
      let extension: string;

      switch (query.format) {
        case 'csv': {
          buffer = this.csvService.generateRawExport(erinnerungen);
          contentType = 'text/csv';
          extension = 'csv';
          break;
        }
        case 'json': {
          buffer = this.jsonService.generateRawExport(erinnerungen);
          contentType = 'application/json';
          extension = 'json';
          break;
        }
        default:
          return Result.fail<ExportResult>(ERINNERUNG_ERROR_CODES.ROHDATEN_EXPORT_FORMAT_INVALID);
      }

      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const filename = `Rohdaten_Export_${einsatzNummer}_${timestamp}.${extension}`;

      return Result.ok({ buffer, contentType, filename });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown export error';
      this.logger.error(`Raw export generation failed: ${message}`, 'ExportRohdatenHandler');
      return Result.fail<ExportResult>(`Raw export generation failed: ${message}`);
    }
  }
}
