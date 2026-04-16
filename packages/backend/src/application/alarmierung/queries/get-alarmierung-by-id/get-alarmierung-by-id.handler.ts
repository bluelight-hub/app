import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { ALARMIERUNG_REPOSITORY } from '@infrastructure/di-tokens';
import type { GetAlarmierungByIdQuery } from './get-alarmierung-by-id.query';

/**
 * Handler für {@link GetAlarmierungByIdQuery}.
 *
 * Liefert `Result.ok(null)`, wenn keine Alarmierung mit der ID existiert oder
 * wenn die gefundene Alarmierung zu einem anderen Einsatz gehört als
 * `query.einsatzId` — der Controller entscheidet über 404.
 *
 * Der Cross-Einsatz-Check nutzt bewusst die gleiche Ausgabe wie „not found",
 * damit die Existenz einer Alarmierung nicht an Nutzer anderer Einsätze
 * geleakt wird.
 */
@Injectable()
export class GetAlarmierungByIdQueryHandler {
  constructor(@Inject(ALARMIERUNG_REPOSITORY) private readonly alarmierungRepository: IAlarmierungRepository) {}

  async execute(query: GetAlarmierungByIdQuery): Promise<Result<AlarmierungAggregate | null>> {
    const idResult = AlarmierungId.create(query.alarmierungId);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<AlarmierungAggregate | null>(idResult.error ?? 'Ungültige AlarmierungId');
    }
    const aggregate = await this.alarmierungRepository.findById(idResult.value);
    if (!aggregate) {
      return Result.ok<AlarmierungAggregate | null>(null);
    }
    if (aggregate.einsatzId.value !== query.einsatzId) {
      // Cross-Einsatz-Zugriff — identische Antwort wie „nicht gefunden", damit
      // die Existenz einer Alarmierung nicht geleakt wird.
      return Result.ok<AlarmierungAggregate | null>(null);
    }
    return Result.ok<AlarmierungAggregate | null>(aggregate);
  }
}
