/**
 * Geo Application Module.
 *
 * Registriert Query Handlers für Geo-Operationen.
 *
 * @module application/geo
 */

import { Module } from '@nestjs/common';
import { GeoInfrastructureModule } from '@infrastructure/geo/geo-infrastructure.module';
import { PlzLookupHandler } from './queries/plz-lookup.handler';
import { AddressSucheHandler } from './queries/address-suche.handler';

@Module({
  imports: [GeoInfrastructureModule],
  providers: [PlzLookupHandler, AddressSucheHandler],
  exports: [PlzLookupHandler, AddressSucheHandler],
})
export class GeoApplicationModule {}
