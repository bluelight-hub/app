import { Result } from '@domain/common/result';
import type { ISicherungspostenRepository, SicherungspostenReadModel } from '@domain/eigenschutz/repositories';
import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { SICHERUNGSPOSTEN_REPOSITORY } from '@infrastructure/di-tokens';
import { GetSicherungspostenQuery } from './get-sicherungsposten.query';

/**
 * Sentinel-Präfix für „Sicherungsposten nicht gefunden" (oder gehört zu einem
 * anderen Einsatz). Der Controller mappt den String auf HTTP 404. Der
 * Cross-Einsatz-Fall wird bewusst **nicht** als 403 signalisiert — die
 * Existenz eines Sicherungspostens in einem fremden Einsatz darf nicht leaken.
 */
export const GET_SICHERUNGSPOSTEN_ERROR_CODES = {
  NOT_FOUND: 'NotFound:Sicherungsposten',
} as const;

/**
 * Query-Handler für `GetSicherungspostenQuery` (Story 4.4, AC1).
 *
 * Liefert das Read-Model (`SicherungspostenReadModel`) samt Persistenz-
 * Metadaten, damit der Controller die DTO-Factory befüllen kann. Die
 * Repository-Methode `findReadModelById` lädt rein per ID; das Einsatz-Scoping
 * erfolgt hier im Handler durch Vergleich mit `aggregate.einsatzId` —
 * symmetrisch zur `loadDto`-Logik im `SicherungspostenController`.
 */
@Injectable()
@QueryHandler(GetSicherungspostenQuery)
export class GetSicherungspostenHandler implements IQueryHandler<GetSicherungspostenQuery, Result<SicherungspostenReadModel>> {
  constructor(
    @Inject(SICHERUNGSPOSTEN_REPOSITORY)
    private readonly sicherungspostenRepo: ISicherungspostenRepository,
  ) {}

  async execute(query: GetSicherungspostenQuery): Promise<Result<SicherungspostenReadModel>> {
    const loadResult = await this.sicherungspostenRepo.findReadModelById(query.postenId);
    if (loadResult.isFailure) {
      return Result.fail<SicherungspostenReadModel>(loadResult.error ?? 'Sicherungsposten konnte nicht geladen werden');
    }
    const readModel = loadResult.value;
    if (!readModel) {
      return Result.fail<SicherungspostenReadModel>(GET_SICHERUNGSPOSTEN_ERROR_CODES.NOT_FOUND);
    }
    if (readModel.aggregate.einsatzId !== query.einsatzId) {
      return Result.fail<SicherungspostenReadModel>(GET_SICHERUNGSPOSTEN_ERROR_CODES.NOT_FOUND);
    }
    return Result.ok<SicherungspostenReadModel>(readModel);
  }
}
