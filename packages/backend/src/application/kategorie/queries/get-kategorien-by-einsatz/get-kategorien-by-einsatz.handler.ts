import { Inject, Injectable } from '@nestjs/common';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import { Result } from '@domain/common/result';
import { KATEGORIE_REPOSITORY } from '@infrastructure/di-tokens';
import { KategorieResponseFactory } from '@application/kategorie/dto';
import type { KategorieResponseDto } from '@application/kategorie/dto';
import type { GetKategorienByEinsatzQuery } from '@application/kategorie/queries';

/**
 * Query Handler: Alle Kategorien eines Einsatzes laden (inkl. geloeschter).
 */
@Injectable()
export class GetKategorienByEinsatzHandler {
  constructor(
    @Inject(KATEGORIE_REPOSITORY)
    private readonly kategorieRepository: IKategorieRepository,
    private readonly responseFactory: KategorieResponseFactory,
  ) {}

  async execute(query: GetKategorienByEinsatzQuery): Promise<Result<KategorieResponseDto[]>> {
    const kategorien = await this.kategorieRepository.findByEinsatzId(query.einsatzId);
    const dtos = await Promise.all(kategorien.map((kategorie) => this.responseFactory.create(kategorie)));
    return Result.ok<KategorieResponseDto[]>(dtos);
  }
}
