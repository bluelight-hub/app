import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TAKTISCHE_ZEICHEN_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { TaktischesZeichenResponseFactory } from '@application/taktische-zeichen/factories/taktisches-zeichen-response.factory';
import type { TaktischesZeichenResponseDto } from '@application/taktische-zeichen/dtos/taktisches-zeichen-response.dto';
import type { GetFahrzeugZeichenQuery } from './get-fahrzeug-zeichen.query';

/**
 * Handler für GetFahrzeugZeichenQuery.
 *
 * Lädt das verknüpfte taktische Zeichen eines Fahrzeugs über die
 * Referenz-Verknüpfung (referenzTyp: 'FAHRZEUG').
 *
 * **Read-Only:** Kein TransactionalCommandHandler nötig.
 */
@Injectable()
export class GetFahrzeugZeichenHandler {
  constructor(
    @Inject(TAKTISCHE_ZEICHEN_REPOSITORY)
    private readonly taktischeZeichenRepository: ITaktischesZeichenRepository,
    private readonly responseFactory: TaktischesZeichenResponseFactory,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus und gibt das verknüpfte Zeichen zurück (oder null).
   *
   * @param query - GetFahrzeugZeichenQuery mit einsatzId und fahrzeugId
   * @returns Result<TaktischesZeichenResponseDto | null> - Zeichen-DTO oder null
   */
  async execute(query: GetFahrzeugZeichenQuery): Promise<Result<TaktischesZeichenResponseDto | null>> {
    this.logger.log(`GetFahrzeugZeichenQuery für Fahrzeug ${query.fahrzeugId} in Einsatz ${query.einsatzId}`);

    const result = await this.taktischeZeichenRepository.findByReferenz('FAHRZEUG', query.fahrzeugId);

    if (result.isFailure) {
      this.logger.error(`Fehler beim Laden des Zeichens für Fahrzeug ${query.fahrzeugId}: ${result.error}`, 'GetFahrzeugZeichenHandler');
      return Result.fail(result.error ?? 'Fehler beim Laden des taktischen Zeichens');
    }

    const zeichen = result.value ?? [];

    if (zeichen.length === 0) {
      this.logger.log(`Kein Zeichen für Fahrzeug ${query.fahrzeugId} gefunden`);
      return Result.ok(null);
    }

    const responseDto = this.responseFactory.create(zeichen[0]!);
    return Result.ok(responseDto);
  }
}
