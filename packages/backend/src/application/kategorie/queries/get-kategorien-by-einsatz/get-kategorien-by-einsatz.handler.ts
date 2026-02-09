import { Inject, Injectable } from '@nestjs/common';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import { Result } from '@domain/common/result';
import { KATEGORIE_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { KategorieResponseFactory } from '../../dto/kategorie-response.factory';
import type { KategorieResponseDto } from '../../dto/kategorie-response.dto';
import type { GetKategorienByEinsatzQuery } from './get-kategorien-by-einsatz.query';

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
