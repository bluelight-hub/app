import { Result } from '@domain/common/result';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';

export type ExportFormat = 'pdf' | 'csv' | 'json';

export interface ExportErinnerungenQueryProps {
  einsatzId: string;
  format: string;
}

export class ExportErinnerungenQuery {
  private static readonly CUID2_PATTERN = /^[a-z0-9]{24,32}$/;
  private static readonly VALID_FORMATS: ExportFormat[] = ['pdf', 'csv', 'json'];

  private constructor(
    public readonly einsatzId: string,
    public readonly format: ExportFormat,
  ) {}

  static create(props: ExportErinnerungenQueryProps): Result<ExportErinnerungenQuery> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';

    if (trimmedEinsatzId.length === 0) {
      return Result.fail<ExportErinnerungenQuery>(ERINNERUNG_ERROR_CODES.QUERY_EINSATZ_ID_REQUIRED);
    }

    if (!ExportErinnerungenQuery.CUID2_PATTERN.test(trimmedEinsatzId)) {
      return Result.fail<ExportErinnerungenQuery>(ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    const formatLower = props.format?.toLowerCase()?.trim() ?? '';
    if (!ExportErinnerungenQuery.VALID_FORMATS.includes(formatLower as ExportFormat)) {
      return Result.fail<ExportErinnerungenQuery>('ERINNERUNG_EXPORT_FORMAT_INVALID');
    }

    return Result.ok(new ExportErinnerungenQuery(trimmedEinsatzId, formatLower as ExportFormat));
  }
}
