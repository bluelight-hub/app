import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import { TAKTISCHE_ZEICHEN_REPOSITORY } from '@infrastructure/di-tokens';
import { TaktischesZeichenResponseFactory } from '../../factories/taktisches-zeichen-response.factory';
import type { TaktischesZeichenResponseDto } from '../../dtos/taktisches-zeichen-response.dto';
import type { FindeZeichenFuerEinsatzQuery } from './finde-zeichen-fuer-einsatz.query';

/**
 * Query Handler: Alle taktischen Zeichen eines Einsatzes laden.
 */
@Injectable()
export class FindeZeichenFuerEinsatzHandler {
  constructor(
    @Inject(TAKTISCHE_ZEICHEN_REPOSITORY)
    private readonly taktischeZeichenRepository: ITaktischesZeichenRepository,
    private readonly responseFactory: TaktischesZeichenResponseFactory,
  ) {}

  async execute(query: FindeZeichenFuerEinsatzQuery): Promise<Result<TaktischesZeichenResponseDto[]>> {
    const findResult = await this.taktischeZeichenRepository.findByEinsatzId(query.einsatzId);
    if (findResult.isFailure) {
      return Result.fail<TaktischesZeichenResponseDto[]>(findResult.error ?? 'ZEICHEN_LADEN_FAILED');
    }

    const dtos = (findResult.value ?? []).map((zeichen) => this.responseFactory.create(zeichen));

    return Result.ok<TaktischesZeichenResponseDto[]>(dtos);
  }
}
