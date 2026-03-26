/**
 * PLZ-Lookup Query Handler.
 *
 * Validiert Input und delegiert an den IPlzLookupPort.
 * Kein CQRS QueryBus — direkter Inject (Projekt-Pattern für Read-Only Queries).
 *
 * @module application/geo/queries
 */

import { Inject, Injectable } from '@nestjs/common';
import type { IPlzLookupPort, PlzLookupErgebnis } from '@domain/ports/i-plz-lookup.port';
import { Result } from '@domain/common/result';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import { GEO_PORTS } from '@infrastructure/di-tokens';

@Injectable()
export class PlzLookupHandler {
  constructor(@Inject(GEO_PORTS.PLZ_LOOKUP) private readonly plzLookup: IPlzLookupPort) {}

  /**
   * Führt einen PLZ-Lookup durch.
   *
   * @param landKuerzel - ISO-3166-1 Alpha-2 Ländercode (z.B. "DE")
   * @param plz - Postleitzahl (z.B. "80331")
   */
  async execute(landKuerzel: string, plz: string): Promise<Result<PlzLookupErgebnis>> {
    // Input-Validierung: Ländercode muss 2 Buchstaben sein
    if (!/^[A-Za-z]{2}$/.test(landKuerzel)) {
      return Result.fail(GeoError.format(GEO_ERROR_CODES.INVALID_INPUT, `Ungültiger Ländercode: '${landKuerzel}' (erwartet: 2 Buchstaben)`));
    }

    // Input-Validierung: PLZ muss 3-10 alphanumerische Zeichen sein
    if (!/^[\dA-Za-z\s-]{3,10}$/.test(plz)) {
      return Result.fail(GeoError.format(GEO_ERROR_CODES.INVALID_INPUT, `Ungültiges PLZ-Format: '${plz}'`));
    }

    return this.plzLookup.lookup(landKuerzel.toUpperCase(), plz);
  }
}
