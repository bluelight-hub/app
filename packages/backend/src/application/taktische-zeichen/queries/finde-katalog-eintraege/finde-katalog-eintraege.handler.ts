import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IZeichenKatalogRepository } from '@domain/taktische-zeichen/ports/izeichen-katalog.repository';
import { ZEICHEN_KATALOG_REPOSITORY } from '@infrastructure/di-tokens';
import type { ZeichenKatalogEintragResponseDto } from '../../dtos/zeichen-katalog-eintrag-response.dto';
import type { FindeKatalogEintraegeQuery } from './finde-katalog-eintraege.query';

/**
 * Query Handler: Katalogeinträge laden mit optionaler Suche und Kategoriefilterung.
 */
@Injectable()
export class FindeKatalogEintraegeHandler {
  constructor(
    @Inject(ZEICHEN_KATALOG_REPOSITORY)
    private readonly zeickenKatalogRepository: IZeichenKatalogRepository,
  ) {}

  async execute(query: FindeKatalogEintraegeQuery): Promise<Result<ZeichenKatalogEintragResponseDto[]>> {
    let findResult;

    if (query.suche) {
      // Freitextsuche hat Vorrang
      findResult = await this.zeickenKatalogRepository.search(query.suche);
    } else if (query.kategorie) {
      // Kategoriefilterung
      findResult = await this.zeickenKatalogRepository.findByKategorie(query.kategorie);
    } else {
      // Alle Einträge laden
      findResult = await this.zeickenKatalogRepository.findAll();
    }

    if (findResult.isFailure) {
      return Result.fail<ZeichenKatalogEintragResponseDto[]>(findResult.error ?? 'KATALOG_LADEN_FAILED');
    }

    const dtos: ZeichenKatalogEintragResponseDto[] = (findResult.value ?? []).map((eintrag) => ({
      id: eintrag.id,
      name: eintrag.name,
      kategorie: eintrag.kategorie,
      ...(eintrag.beschreibung !== undefined && { beschreibung: eintrag.beschreibung }),
      zeichenDefinition: {
        grundzeichen: eintrag.zeichenDefinition['grundzeichen'] as string,
        ...(eintrag.zeichenDefinition['organisation'] !== undefined && { organisation: eintrag.zeichenDefinition['organisation'] as string }),
        ...(eintrag.zeichenDefinition['fachaufgabe'] !== undefined && { fachaufgabe: eintrag.zeichenDefinition['fachaufgabe'] as string }),
        ...(eintrag.zeichenDefinition['einheit'] !== undefined && { einheit: eintrag.zeichenDefinition['einheit'] as string }),
        ...(eintrag.zeichenDefinition['verwaltungsstufe'] !== undefined && { verwaltungsstufe: eintrag.zeichenDefinition['verwaltungsstufe'] as string }),
        ...(eintrag.zeichenDefinition['symbol'] !== undefined && { symbol: eintrag.zeichenDefinition['symbol'] as string }),
        ...(eintrag.zeichenDefinition['text'] !== undefined && { text: eintrag.zeichenDefinition['text'] as string }),
      },
      tags: eintrag.tags,
      sortOrder: eintrag.sortOrder,
      istStandard: eintrag.istStandard,
    }));

    return Result.ok<ZeichenKatalogEintragResponseDto[]>(dtos);
  }
}
