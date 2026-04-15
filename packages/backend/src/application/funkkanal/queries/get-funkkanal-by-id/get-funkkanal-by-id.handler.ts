import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { FUNKKANAL_REPOSITORY } from '@infrastructure/di-tokens';
import type { GetFunkkanalByIdQuery } from './get-funkkanal-by-id.query';

/**
 * Handler für {@link GetFunkkanalByIdQuery}.
 *
 * Gibt `Result.ok(null)` zurück, wenn der Kanal nicht existiert —
 * der Controller entscheidet über 404.
 */
@Injectable()
export class GetFunkkanalByIdQueryHandler {
  constructor(@Inject(FUNKKANAL_REPOSITORY) private readonly funkkanalRepository: IFunkkanalRepository) {}

  async execute(query: GetFunkkanalByIdQuery): Promise<Result<FunkkanalAggregate | null>> {
    const idResult = FunkkanalId.create(query.kanalId);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<FunkkanalAggregate | null>(idResult.error ?? 'Ungültige FunkkanalId');
    }
    const aggregate = await this.funkkanalRepository.findById(idResult.value);
    return Result.ok<FunkkanalAggregate | null>(aggregate);
  }
}
