/**
 * Adresssuche Query Handler.
 *
 * Validiert Input und delegiert an den IAddressSuchePort.
 * Kein CQRS QueryBus — direkter Inject (Projekt-Pattern für Read-Only Queries).
 *
 * @module application/geo/queries
 */

import { Inject, Injectable } from '@nestjs/common';
import type { IAddressSuchePort, AddressSucheErgebnis, AddressSucheOptionen } from '@domain/ports/i-address-suche.port';
import { Result } from '@domain/common/result';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import { GEO_PORTS } from '@infrastructure/di-tokens';

@Injectable()
export class AddressSucheHandler {
  constructor(@Inject(GEO_PORTS.ADDRESS_SUCHE) private readonly addressSuche: IAddressSuchePort) {}

  /**
   * Führt eine Adresssuche durch.
   *
   * @param query - Suchbegriff (2-100 Zeichen)
   * @param options - Optionale Such-Parameter
   */
  async execute(query: string, options?: AddressSucheOptionen): Promise<Result<AddressSucheErgebnis[]>> {
    // Input-Validierung: Query muss ein String mit 2-100 Zeichen sein
    if (typeof query !== 'string' || !query || query.length < 2 || query.length > 100) {
      return Result.fail(GeoError.format(GEO_ERROR_CODES.INVALID_INPUT, `Suchbegriff muss 2-100 Zeichen lang sein (erhalten: ${query?.length ?? 0})`));
    }

    return this.addressSuche.search(query, options);
  }
}
