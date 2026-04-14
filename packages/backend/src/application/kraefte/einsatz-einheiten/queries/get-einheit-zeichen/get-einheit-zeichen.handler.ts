import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TAKTISCHE_ZEICHEN_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { TaktischesZeichenResponseFactory } from '@application/taktische-zeichen/factories/taktisches-zeichen-response.factory';
import type { TaktischesZeichenResponseDto } from '@application/taktische-zeichen/dtos/taktisches-zeichen-response.dto';
import type { GetEinheitZeichenQuery } from './get-einheit-zeichen.query';

/**
 * Handler für GetEinheitZeichenQuery.
 *
 * Lädt das verknüpfte taktische Zeichen einer Einheit über die
 * Referenz-Verknüpfung (referenzTyp: 'EINHEIT').
 *
 * **Read-Only:** Kein TransactionalCommandHandler nötig.
 *
 * **Issue #667:** Einheit-Zeichen-Verknüpfung
 */
@Injectable()
export class GetEinheitZeichenHandler {
  constructor(
    @Inject(TAKTISCHE_ZEICHEN_REPOSITORY)
    private readonly taktischeZeichenRepository: ITaktischesZeichenRepository,
    private readonly responseFactory: TaktischesZeichenResponseFactory,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus und gibt das verknüpfte Zeichen zurück (oder null).
   *
   * @param query - GetEinheitZeichenQuery mit einsatzId und einheitId
   * @returns Result<TaktischesZeichenResponseDto | null> - Zeichen-DTO oder null
   */
  async execute(query: GetEinheitZeichenQuery): Promise<Result<TaktischesZeichenResponseDto | null>> {
    this.logger.log(`GetEinheitZeichenQuery für Einheit ${query.einheitId} in Einsatz ${query.einsatzId}`);

    const result = await this.taktischeZeichenRepository.findByReferenz('EINHEIT', query.einheitId);

    if (result.isFailure) {
      this.logger.error(`Fehler beim Laden des Zeichens für Einheit ${query.einheitId}: ${result.error}`, 'GetEinheitZeichenHandler');
      return Result.fail(result.error ?? 'Fehler beim Laden des taktischen Zeichens');
    }

    const zeichen = result.value ?? [];

    if (zeichen.length === 0) {
      this.logger.log(`Kein Zeichen für Einheit ${query.einheitId} gefunden`);
      return Result.ok(null);
    }

    // Erstes verknüpftes Zeichen zurückgeben (zeichen[0] ist garantiert vorhanden nach length-Check)
    const responseDto = this.responseFactory.create(zeichen[0]!);
    return Result.ok(responseDto);
  }
}
