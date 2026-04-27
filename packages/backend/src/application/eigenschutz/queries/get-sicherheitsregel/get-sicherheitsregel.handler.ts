import { Result } from '@domain/common/result';
import type { ISicherheitsregelRepository, SicherheitsregelReadModel } from '@domain/eigenschutz/repositories/i-sicherheitsregel.repository';
import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { SICHERHEITSREGEL_REPOSITORY } from '@infrastructure/di-tokens';
import { GetSicherheitsregelQuery } from './get-sicherheitsregel.query';

/**
 * Sentinel-Präfix für „Sicherheitsregel nicht gefunden" (oder gehört zu einem
 * anderen Einsatz). Der Controller mappt den String auf HTTP 404. Der
 * Cross-Einsatz-Fall wird bewusst **nicht** als 403 signalisiert — die
 * Existenz einer Regel in einem fremden Einsatz darf nicht leaken.
 */
export const GET_SICHERHEITSREGEL_ERROR_CODES = {
  NOT_FOUND: 'NotFound:Sicherheitsregel',
} as const;

/**
 * Query-Handler für `GetSicherheitsregelQuery` (Story 2.6 AC6).
 *
 * Liefert das Read-Model (`SicherheitsregelReadModel`) samt Persistenz-
 * Metadaten + `propagationGroupId`, damit der Controller die DTO-Factory
 * befüllen kann. Nutzt `findReadModelById` mit Einsatz-Scoping direkt auf
 * Repository-Ebene (siehe Port-Kontrakt — `einsatzId` ist Teil der Query).
 */
@Injectable()
@QueryHandler(GetSicherheitsregelQuery)
export class GetSicherheitsregelHandler implements IQueryHandler<GetSicherheitsregelQuery, Result<SicherheitsregelReadModel>> {
  constructor(
    @Inject(SICHERHEITSREGEL_REPOSITORY)
    private readonly sicherheitsregelRepo: ISicherheitsregelRepository,
  ) {}

  async execute(query: GetSicherheitsregelQuery): Promise<Result<SicherheitsregelReadModel>> {
    const loadResult = await this.sicherheitsregelRepo.findReadModelById(query.regelId, query.einsatzId);
    if (loadResult.isFailure) {
      return Result.fail<SicherheitsregelReadModel>(loadResult.error ?? 'Sicherheitsregel konnte nicht geladen werden');
    }
    const readModel = loadResult.value;
    if (!readModel) {
      return Result.fail<SicherheitsregelReadModel>(GET_SICHERHEITSREGEL_ERROR_CODES.NOT_FOUND);
    }
    return Result.ok<SicherheitsregelReadModel>(readModel);
  }
}
