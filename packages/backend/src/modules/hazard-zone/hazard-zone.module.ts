import { Module } from '@nestjs/common';
import { HazardZoneApplicationModule } from '@/application/hazard-zone/hazard-zone-application.module';
import { HazardZoneController } from './controllers/hazard-zone.controller';

/**
 * HTTP-Modul für HazardZones (Issue #627).
 *
 * Integriert die Gefahrenmatrix mit der Lagekarte — stellt REST-Endpunkte
 * zum Erstellen, Aktualisieren, Löschen und Auflisten räumlicher
 * Gefahrenbereiche bereit.
 */
@Module({
  imports: [HazardZoneApplicationModule],
  controllers: [HazardZoneController],
})
export class HazardZoneModule {}
