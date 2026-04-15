import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ALARMIERUNG_REPOSITORY } from '@infrastructure/di-tokens';
import type { ListAlarmierungenQuery } from './list-alarmierungen.query';

/**
 * Handler für {@link ListAlarmierungenQuery}.
 *
 * Liefert die Alarmierungen des Einsatzes nach `alarmierungszeit` DESC.
 * Sortierung wird hier (defensiv) nochmals durchgeführt, falls das Repository
 * die Sortierung nicht garantiert.
 */
@Injectable()
export class ListAlarmierungenQueryHandler {
  constructor(@Inject(ALARMIERUNG_REPOSITORY) private readonly alarmierungRepository: IAlarmierungRepository) {}

  async execute(query: ListAlarmierungenQuery): Promise<Result<AlarmierungAggregate[]>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<AlarmierungAggregate[]>(einsatzIdResult.error ?? 'Ungültige EinsatzId');
    }

    const aggregates = await this.alarmierungRepository.findByEinsatzId(einsatzIdResult.value, {
      status: query.status,
      skip: query.skip,
      take: query.take,
    });

    const sorted = [...aggregates].sort((a, b) => b.alarmierungszeit.getTime() - a.alarmierungszeit.getTime());
    return Result.ok<AlarmierungAggregate[]>(sorted);
  }
}
