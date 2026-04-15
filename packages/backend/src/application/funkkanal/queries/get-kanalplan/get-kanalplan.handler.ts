import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { FUNKKANAL_REPOSITORY } from '@infrastructure/di-tokens';
import type { GetKanalplanQuery } from './get-kanalplan.query';

/**
 * Handler für {@link GetKanalplanQuery}. Read-only — keine Transaktion nötig.
 *
 * Sortierung erfolgt bereits im Repository (`sortIndex asc, createdAt asc`).
 */
@Injectable()
export class GetKanalplanQueryHandler {
  constructor(@Inject(FUNKKANAL_REPOSITORY) private readonly funkkanalRepository: IFunkkanalRepository) {}

  async execute(query: GetKanalplanQuery): Promise<Result<FunkkanalAggregate[]>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<FunkkanalAggregate[]>(einsatzIdResult.error ?? 'Ungültige EinsatzId');
    }
    const kanaele = await this.funkkanalRepository.findByEinsatzId(einsatzIdResult.value, {
      includeArchived: query.includeArchived,
    });
    return Result.ok<FunkkanalAggregate[]>(kanaele);
  }
}
