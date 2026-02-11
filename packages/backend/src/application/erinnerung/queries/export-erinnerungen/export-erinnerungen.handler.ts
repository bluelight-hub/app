import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { ILogger } from '@domain/ports/i-logger.port';
import { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ERINNERUNG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PdfExportService } from '@infrastructure/export/pdf-export.service';
import { CsvExportService } from '@infrastructure/export/csv-export.service';
import { JsonExportService } from '@infrastructure/export/json-export.service';
import { GetErinnerungStatistikHandler } from '../get-erinnerung-statistik/get-erinnerung-statistik.handler';
import { GetPersonStatistikHandler } from '../get-person-statistik/get-person-statistik.handler';
import { GetEskalationsAnalyseHandler } from '../get-eskalations-analyse/get-eskalations-analyse.handler';
import { GetReaktionszeitStatistikHandler } from '../get-reaktionszeit-statistik/get-reaktionszeit-statistik.handler';
import { GetErinnerungStatistikQuery } from '../get-erinnerung-statistik/get-erinnerung-statistik.query';
import { GetPersonStatistikQuery } from '../get-person-statistik/get-person-statistik.query';
import { GetEskalationsAnalyseQuery } from '../get-eskalations-analyse/get-eskalations-analyse.query';
import { GetReaktionszeitStatistikQuery } from '../get-reaktionszeit-statistik/get-reaktionszeit-statistik.query';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';
import type { ExportErinnerungenQuery } from './export-erinnerungen.query';

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

@Injectable()
export class ExportErinnerungenHandler {
  constructor(
    @Inject(ERINNERUNG_REPOSITORY)
    private readonly erinnerungRepository: IErinnerungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
    private readonly statistikHandler: GetErinnerungStatistikHandler,
    private readonly personStatistikHandler: GetPersonStatistikHandler,
    private readonly eskalationsAnalyseHandler: GetEskalationsAnalyseHandler,
    private readonly reaktionszeitHandler: GetReaktionszeitStatistikHandler,
    private readonly pdfService: PdfExportService,
    private readonly csvService: CsvExportService,
    private readonly jsonService: JsonExportService,
  ) {}

  async execute(query: ExportErinnerungenQuery): Promise<Result<ExportResult>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<ExportResult>(einsatzIdResult.error ?? ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    // Erinnerungen fuer Export laden
    const exportResult = await this.erinnerungRepository.getErinnerungenForExport(einsatzIdResult.value);
    if (exportResult.isFailure) {
      this.logger.error(`Failed to load erinnerungen for export: ${exportResult.error}`, 'ExportErinnerungenHandler');
      return Result.fail<ExportResult>(exportResult.error ?? ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    const erinnerungen = exportResult.value!;
    const einsatzNummer = query.einsatzId.substring(0, 8);

    try {
      let buffer: Buffer;
      let contentType: string;
      let extension: string;

      switch (query.format) {
        case 'pdf': {
          // Alle Statistiken parallel laden
          const [statistikResult, personResult, eskalationsResult, reaktionszeitResult] = await Promise.all([
            this.statistikHandler.execute(GetErinnerungStatistikQuery.create({ einsatzId: query.einsatzId }).value!),
            this.personStatistikHandler.execute(GetPersonStatistikQuery.create({ einsatzId: query.einsatzId }).value!),
            this.eskalationsAnalyseHandler.execute(GetEskalationsAnalyseQuery.create({ einsatzId: query.einsatzId }).value!),
            this.reaktionszeitHandler.execute(GetReaktionszeitStatistikQuery.create({ einsatzId: query.einsatzId }).value!),
          ]);

          if (statistikResult.isFailure || personResult.isFailure || eskalationsResult.isFailure || reaktionszeitResult.isFailure) {
            const errors = [
              statistikResult.isFailure ? `Statistik: ${statistikResult.error}` : null,
              personResult.isFailure ? `Person: ${personResult.error}` : null,
              eskalationsResult.isFailure ? `Eskalation: ${eskalationsResult.error}` : null,
              reaktionszeitResult.isFailure ? `Reaktionszeit: ${reaktionszeitResult.error}` : null,
            ].filter(Boolean);
            this.logger.error(`Failed to load statistics for PDF export: ${errors.join(', ')}`, 'ExportErinnerungenHandler');
            return Result.fail<ExportResult>(ERINNERUNG_ERROR_CODES.QUERY_FAILED);
          }

          buffer = await this.pdfService.generateExport(statistikResult.value!, personResult.value!, eskalationsResult.value!, reaktionszeitResult.value!, erinnerungen, einsatzNummer);
          contentType = 'application/pdf';
          extension = 'pdf';
          break;
        }
        case 'csv': {
          buffer = this.csvService.generateExport(erinnerungen);
          contentType = 'text/csv';
          extension = 'csv';
          break;
        }
        case 'json': {
          buffer = this.jsonService.generateExport(erinnerungen);
          contentType = 'application/json';
          extension = 'json';
          break;
        }
        default:
          return Result.fail<ExportResult>('ERINNERUNG_EXPORT_FORMAT_INVALID');
      }

      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const filename = `Erinnerungen_Export_${einsatzNummer}_${timestamp}.${extension}`;

      return Result.ok({ buffer, contentType, filename });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown export error';
      this.logger.error(`Export generation failed: ${message}`, 'ExportErinnerungenHandler');
      return Result.fail<ExportResult>(`Export generation failed: ${message}`);
    }
  }
}
