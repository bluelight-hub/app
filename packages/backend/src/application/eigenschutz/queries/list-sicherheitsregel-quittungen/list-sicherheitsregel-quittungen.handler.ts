import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import type { ISicherheitsregelQuittungRepository, SicherheitsregelQuittungReadModel } from '@domain/eigenschutz/repositories/i-sicherheitsregel-quittung.repository';
import { SICHERHEITSREGEL_QUITTUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { SicherheitsregelQuittungDto } from '../../dto/sicherheitsregel-quittung.dto';
import { SicherheitsregelQuittungFactory } from '../../dto/sicherheitsregel-quittung.factory';
import { ListSicherheitsregelQuittungenQuery } from './list-sicherheitsregel-quittungen.query';

/**
 * Handler für `ListSicherheitsregelQuittungenQuery` (Story 2.7 AC10).
 *
 * Sortierung des Repository-Layers (`quittiertAm DESC`, `id ASC`) wird durchgereicht.
 * `einheitName` kommt aus dem Read-Model (Repo-JOIN); User-Namens-Lookup ist
 * Phase-2-Enrichment und bleibt hier off (Story 2.7 Task 2.5 Hinweis).
 */
@Injectable()
@QueryHandler(ListSicherheitsregelQuittungenQuery)
export class ListSicherheitsregelQuittungenHandler implements IQueryHandler<ListSicherheitsregelQuittungenQuery, Result<SicherheitsregelQuittungDto[]>> {
  constructor(
    @Inject(SICHERHEITSREGEL_QUITTUNG_REPOSITORY)
    private readonly quittungRepo: ISicherheitsregelQuittungRepository,
  ) {}

  async execute(query: ListSicherheitsregelQuittungenQuery): Promise<Result<SicherheitsregelQuittungDto[]>> {
    const result = await this.quittungRepo.findByRegel(query.einsatzId, query.regelId);
    if (result.isFailure) {
      return Result.fail<SicherheitsregelQuittungDto[]>(result.error ?? 'Quittungen konnten nicht geladen werden');
    }
    const readModels: SicherheitsregelQuittungReadModel[] = result.value ?? [];
    const dtos = readModels.map((rm) => SicherheitsregelQuittungFactory.toDto(rm));
    return Result.ok(dtos);
  }
}
