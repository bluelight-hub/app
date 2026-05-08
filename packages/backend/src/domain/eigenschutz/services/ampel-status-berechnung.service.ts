import { Result } from '@domain/common/result';

export type AmpelStatus = 'GRUEN' | 'GELB' | 'ROT';

export interface AmpelStatusInput {
  offeneGefaehrdungenHoch: number;
  ausstehendePsaQuittungen: number;
  ausstehendeRegelQuittungen: number;
  offeneVorfaelle: number;
  ungeloesteRueckmeldungen: number;
}

const COUNTER_FIELDS = [
  'offeneGefaehrdungenHoch',
  'ausstehendePsaQuittungen',
  'ausstehendeRegelQuittungen',
  'offeneVorfaelle',
  'ungeloesteRueckmeldungen',
] as const satisfies readonly (keyof AmpelStatusInput)[];

/**
 * Zentrale Statuslogik für das Ampel-Read-Model.
 *
 * Domain-seitig bewusst ohne Prisma-Enum, damit der Status unabhängig von der
 * Persistenz berechnet und in Tests stabil geprüft werden kann.
 */
export class AmpelStatusBerechnungService {
  berechneStatus(input: AmpelStatusInput): Result<AmpelStatus> {
    for (const field of COUNTER_FIELDS) {
      if (input[field] < 0) {
        return Result.fail(`ValidationFailed:AmpelStatus:negativeCounter:${field}`);
      }
    }

    if (input.offeneVorfaelle > 0 || input.offeneGefaehrdungenHoch > 0) {
      return Result.ok('ROT');
    }

    if (input.ausstehendePsaQuittungen > 0 || input.ausstehendeRegelQuittungen > 0 || input.ungeloesteRueckmeldungen > 0) {
      return Result.ok('GELB');
    }

    return Result.ok('GRUEN');
  }
}
