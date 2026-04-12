import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import { TAKTISCHE_ZEICHEN_REPOSITORY } from '@infrastructure/di-tokens';
import { TaktischesZeichenResponseFactory } from '../../factories/taktisches-zeichen-response.factory';
import type { TaktischesZeichenResponseDto } from '../../dtos/taktisches-zeichen-response.dto';
import type { FindeZeichenFuerLagekarteQuery } from './finde-zeichen-fuer-lagekarte.query';

/**
 * Query Handler: Alle platzierten taktischen Zeichen einer Lagekarte laden.
 */
@Injectable()
export class FindeZeichenFuerLagekarteHandler {
  constructor(
    @Inject(TAKTISCHE_ZEICHEN_REPOSITORY)
    private readonly taktischeZeichenRepository: ITaktischesZeichenRepository,
    private readonly responseFactory: TaktischesZeichenResponseFactory,
  ) {}

  async execute(query: FindeZeichenFuerLagekarteQuery): Promise<Result<TaktischesZeichenResponseDto[]>> {
    const findResult = await this.taktischeZeichenRepository.findByLagekarteId(query.lagekarteId);
    if (findResult.isFailure) {
      return Result.fail<TaktischesZeichenResponseDto[]>(findResult.error ?? 'ZEICHEN_LADEN_FAILED');
    }

    const dtos = (findResult.value ?? []).map((zeichen) => this.responseFactory.create(zeichen));

    return Result.ok<TaktischesZeichenResponseDto[]>(dtos);
  }
}
