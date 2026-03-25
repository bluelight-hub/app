import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { ILogger } from '@domain/ports/i-logger.port';
import { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ERINNERUNG_REPOSITORY, LOGGER, PDF_EXPORT_SERVICE, CSV_EXPORT_SERVICE, JSON_EXPORT_SERVICE } from '@infrastructure/di-tokens';
import { IPdfExportService } from '../../ports/i-pdf-export.service';
import { ICsvExportService } from '../../ports/i-csv-export.service';
import { IJsonExportService } from '../../ports/i-json-export.service';
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
    @Inject(PDF_EXPORT_SERVICE)
    private readonly pdfService: IPdfExportService,
    @Inject(CSV_EXPORT_SERVICE)
    private readonly csvService: ICsvExportService,
    @Inject(JSON_EXPORT_SERVICE)
    private readonly jsonService: IJsonExportService,
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

    // eslint-disable-next-line typescript/no-non-null-assertion -- Result.value ist nach isFailure-Check garantiert
    const erinnerungen = exportResult.value!;
    const einsatzNummer = query.einsatzId.substring(0, 8);

    try {
      let buffer: Buffer;
      let contentType: string;
      let extension: string;

      switch (query.format) {
        case 'pdf': {
          // Alle Statistiken parallel laden
          // eslint-disable-next-line typescript/no-non-null-assertion -- Query.create() mit validem einsatzId gibt immer Ok zurueck
          const statistikQuery = GetErinnerungStatistikQuery.create({ einsatzId: query.einsatzId }).value!;
          // eslint-disable-next-line typescript/no-non-null-assertion -- Query.create() mit validem einsatzId gibt immer Ok zurueck
          const personQuery = GetPersonStatistikQuery.create({ einsatzId: query.einsatzId }).value!;
          // eslint-disable-next-line typescript/no-non-null-assertion -- Query.create() mit validem einsatzId gibt immer Ok zurueck
          const eskalationsQuery = GetEskalationsAnalyseQuery.create({ einsatzId: query.einsatzId }).value!;
          // eslint-disable-next-line typescript/no-non-null-assertion -- Query.create() mit validem einsatzId gibt immer Ok zurueck
          const reaktionszeitQuery = GetReaktionszeitStatistikQuery.create({ einsatzId: query.einsatzId }).value!;

          const [statistikResult, personResult, eskalationsResult, reaktionszeitResult] = await Promise.all([
            this.statistikHandler.execute(statistikQuery),
            this.personStatistikHandler.execute(personQuery),
            this.eskalationsAnalyseHandler.execute(eskalationsQuery),
            this.reaktionszeitHandler.execute(reaktionszeitQuery),
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

          // eslint-disable-next-line typescript/no-non-null-assertion -- Result.value ist nach isFailure-Check garantiert
          const statistik = statistikResult.value!;
          // eslint-disable-next-line typescript/no-non-null-assertion -- Result.value ist nach isFailure-Check garantiert
          const person = personResult.value!;
          // eslint-disable-next-line typescript/no-non-null-assertion -- Result.value ist nach isFailure-Check garantiert
          const eskalation = eskalationsResult.value!;
          // eslint-disable-next-line typescript/no-non-null-assertion -- Result.value ist nach isFailure-Check garantiert
          const reaktionszeit = reaktionszeitResult.value!;

          buffer = await this.pdfService.generateExport(statistik, person, eskalation, reaktionszeit, erinnerungen, einsatzNummer);
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
