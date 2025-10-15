import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { EinsatzModule } from '../../einsatz/einsatz.module';

import { LagekarteController } from './controllers/lagekarte.controller';
import { PoiController } from './controllers/poi.controller';

import { LagekarteService } from './services/lagekarte.service';
import { PoiService } from './services/poi.service';
import { GeocodingService } from './services/geocoding.service';

import { LagekarteRepository } from './repositories/lagekarte.repository';
import { PoiRepository } from './repositories/poi.repository';

/**
 * Lagekarte Module
 *
 * Stellt POI-Management und Geocoding-Funktionalität für Einsatz-Lagekarten bereit.
 * Nutzt Nominatim-API für Geocoding (Rate-Limited auf 1 req/s).
 *
 * @module LagekarteModule
 */
@Module({
  imports: [
    PrismaModule,
    EinsatzModule, // Import for EinsatzService (read-only access to einsatzort)
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [LagekarteController, PoiController],
  providers: [LagekarteService, PoiService, GeocodingService, LagekarteRepository, PoiRepository],
  exports: [LagekarteService, PoiService, GeocodingService, LagekarteRepository, PoiRepository],
})
export class LagekarteModule {}
