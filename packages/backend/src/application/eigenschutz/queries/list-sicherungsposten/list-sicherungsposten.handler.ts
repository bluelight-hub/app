import { Result } from '@domain/common/result';
import type { ISicherungspostenRepository, SicherungspostenReadModel } from '@domain/eigenschutz/repositories';
import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { SICHERUNGSPOSTEN_REPOSITORY } from '@infrastructure/di-tokens';
import { ListSicherungspostenQuery } from './list-sicherungsposten.query';

@Injectable()
@QueryHandler(ListSicherungspostenQuery)
export class ListSicherungspostenHandler implements IQueryHandler<ListSicherungspostenQuery, Result<SicherungspostenReadModel[]>> {
  constructor(
    @Inject(SICHERUNGSPOSTEN_REPOSITORY)
    private readonly postenRepo: ISicherungspostenRepository,
  ) {}

  async execute(query: ListSicherungspostenQuery): Promise<Result<SicherungspostenReadModel[]>> {
    const result = query.status === 'AKTIV' ? await this.postenRepo.findActiveByEinsatzId(query.einsatzId) : await this.postenRepo.findResolvedByEinsatzId(query.einsatzId);
    if (result.isFailure || !result.value) {
      return Result.fail<SicherungspostenReadModel[]>(result.error ?? 'Sicherungsposten konnten nicht geladen werden');
    }
    return Result.ok(result.value);
  }
}
