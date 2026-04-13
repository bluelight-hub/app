import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IDefaultZeichenRepository } from '@domain/taktische-zeichen/ports/idefault-zeichen.repository';
import { DEFAULT_ZEICHEN_REPOSITORY } from '@infrastructure/di-tokens';
import { DefaultZeichenResponseDto } from '../../dtos/default-zeichen-response.dto';
import type { FindeDefaultZeichenQuery } from './finde-default-zeichen.query';

/**
 * Query Handler: Standard-Zeichen-Definitionen für Fahrzeug- oder Einheitentypen laden.
 * Nutzt IDefaultZeichenRepository Port für Clean Architecture Konformität.
 */
@Injectable()
export class FindeDefaultZeichenHandler {
  constructor(
    @Inject(DEFAULT_ZEICHEN_REPOSITORY)
    private readonly defaultZeichenRepository: IDefaultZeichenRepository,
  ) {}

  async execute(query: FindeDefaultZeichenQuery): Promise<Result<DefaultZeichenResponseDto[]>> {
    const entriesResult = query.typ === 'fahrzeugtypen' ? await this.defaultZeichenRepository.findAllFahrzeugtypen() : await this.defaultZeichenRepository.findAllEinheitentypen();

    if (entriesResult.isFailure || !entriesResult.value) {
      return Result.fail(entriesResult.error ?? 'DEFAULT_ZEICHEN_LOAD_FAILED');
    }

    const dtos: DefaultZeichenResponseDto[] = entriesResult.value.map((entry) => {
      const dto = new DefaultZeichenResponseDto();
      dto.referenzId = entry.referenzId;
      dto.typBezeichnung = entry.typBezeichnung;
      dto.zeichenDefinition = entry.zeichenDefinition.toJson();
      return dto;
    });

    return Result.ok(dtos);
  }
}
