/**
 * Geo Infrastructure Module.
 *
 * Bindet Geo-Adapter an die Domain Ports.
 * CACHE_MANAGER ist global verfügbar (via InfrastructureCommonModule).
 *
 * @module infrastructure/geo
 */

import { Module } from '@nestjs/common';
import { ResilienceModule } from '@infrastructure/resilience/resilience.module';
import { GEO_PORTS } from '@infrastructure/di-tokens';
import { PlzLookupAdapter } from './plz-lookup.adapter';
import { AddressSucheAdapter } from './address-suche.adapter';

@Module({
  imports: [ResilienceModule],
  providers: [
    {
      provide: GEO_PORTS.PLZ_LOOKUP,
      useClass: PlzLookupAdapter,
    },
    {
      provide: GEO_PORTS.ADDRESS_SUCHE,
      useClass: AddressSucheAdapter,
    },
  ],
  exports: [GEO_PORTS.PLZ_LOOKUP, GEO_PORTS.ADDRESS_SUCHE],
})
export class GeoInfrastructureModule {}
