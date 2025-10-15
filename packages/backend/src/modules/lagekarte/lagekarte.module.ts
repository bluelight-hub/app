import { EinsatzModule } from '@/einsatz/einsatz.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { milliseconds } from 'date-fns';
import { GeocodingController } from './controllers/geocoding.controller';

import { LagekarteController } from './controllers/lagekarte.controller';
import { PoiController } from './controllers/poi.controller';

import { LagekarteRepository } from './repositories/lagekarte.repository';
import { PoiRepository } from './repositories/poi.repository';
import { GeocodingService } from './services/geocoding.service';

import { LagekarteService } from './services/lagekarte.service';
import { PoiService } from './services/poi.service';

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
    ThrottlerModule.forRoot([
      {
        ttl: milliseconds({ seconds: 1 }), // 1 second
        limit: 1, // 1 request per TTL (Nominatim policy: 1 req/s)
      },
    ]),
  ],
  controllers: [LagekarteController, PoiController, GeocodingController],
  providers: [LagekarteService, PoiService, GeocodingService, LagekarteRepository, PoiRepository],
  exports: [LagekarteService, PoiService, GeocodingService, LagekarteRepository, PoiRepository],
})
export class LagekarteModule {}
