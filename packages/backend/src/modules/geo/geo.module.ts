/**
 * Geo Module - HTTP Layer.
 *
 * Registriert Geo-Controller und importiert Application Module.
 *
 * @module modules/geo
 */

import { Module } from '@nestjs/common';
import { GeoApplicationModule } from '@/application/geo/geo-application.module';
import { PlzLookupController } from './controllers/plz-lookup.controller';
import { AddressSucheController } from './controllers/address-suche.controller';

@Module({
  imports: [GeoApplicationModule],
  controllers: [PlzLookupController, AddressSucheController],
})
export class GeoModule {}
