import { Inject, Injectable } from '@nestjs/common';
import type { INotizRepository } from '@domain/notiz/repositories/i-notiz.repository';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import { Result } from '@domain/common/result';
import { KATEGORIE_REPOSITORY, NOTIZ_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { NotizResponseFactory } from '../../dto/notiz-response.factory';
import type { NotizResponseDto } from '../../dto/notiz-response.dto';
import type { GetNotizenByEinsatzQuery } from './get-notizen-by-einsatz.query';

/**
 * Query Handler: Alle sichtbaren Notizen eines Einsatzes laden (eigene + team-sichtbare).
 */
@Injectable()
export class GetNotizenByEinsatzHandler {
  constructor(
    @Inject(NOTIZ_REPOSITORY)
    private readonly notizRepository: INotizRepository,
    @Inject(KATEGORIE_REPOSITORY)
    private readonly kategorieRepository: IKategorieRepository,
    private readonly responseFactory: NotizResponseFactory,
  ) {}

  async execute(query: GetNotizenByEinsatzQuery): Promise<Result<NotizResponseDto[]>> {
    const notizen = await this.notizRepository.findByEinsatzId(query.einsatzId, query.userId);

    // Story 8.2: Kategorien effizient laden (batch für alle Notizen)
    const kategorien = await this.kategorieRepository.findByEinsatzId(query.einsatzId);
    const kategorieMap = new Map<string, { name: string; farbe: string }>();
    for (const kategorie of kategorien) {
      kategorieMap.set(kategorie.id.toString(), {
        name: kategorie.name.value,
        farbe: kategorie.farbe.value,
      });
    }

    // Kategorie-Daten an Factory übergeben
    const dtos = await Promise.all(
      notizen.map((notiz) => {
        const kategorieData = notiz.kategorieId ? kategorieMap.get(notiz.kategorieId) : null;
        return this.responseFactory.create(notiz, kategorieData ?? null);
      }),
    );
    return Result.ok<NotizResponseDto[]>(dtos);
  }
}
