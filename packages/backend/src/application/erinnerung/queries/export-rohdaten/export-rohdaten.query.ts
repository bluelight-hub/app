import { Result } from '@domain/common/result';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';

export type RohdatenExportFormat = 'csv' | 'json';

export interface ExportRohdatenQueryProps {
  einsatzId: string;
  einsatzNummer: string;
  format: string;
}

export class ExportRohdatenQuery {
  private static readonly CUID2_PATTERN = /^[a-z0-9]{24,32}$/;
  private static readonly VALID_FORMATS: RohdatenExportFormat[] = ['csv', 'json'];

  private constructor(
    public readonly einsatzId: string,
    public readonly einsatzNummer: string,
    public readonly format: RohdatenExportFormat,
  ) {}

  static create(props: ExportRohdatenQueryProps): Result<ExportRohdatenQuery> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';

    if (trimmedEinsatzId.length === 0) {
      return Result.fail<ExportRohdatenQuery>(ERINNERUNG_ERROR_CODES.QUERY_EINSATZ_ID_REQUIRED);
    }

    if (!ExportRohdatenQuery.CUID2_PATTERN.test(trimmedEinsatzId)) {
      return Result.fail<ExportRohdatenQuery>(ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    const formatLower = props.format?.toLowerCase()?.trim() ?? '';
    if (!ExportRohdatenQuery.VALID_FORMATS.includes(formatLower as RohdatenExportFormat)) {
      return Result.fail<ExportRohdatenQuery>(ERINNERUNG_ERROR_CODES.ROHDATEN_EXPORT_FORMAT_INVALID);
    }

    return Result.ok(new ExportRohdatenQuery(trimmedEinsatzId, props.einsatzNummer, formatLower as RohdatenExportFormat));
  }
}
