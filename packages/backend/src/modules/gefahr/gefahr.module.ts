import { Module } from '@nestjs/common';
import { GefahrApplicationModule } from '@/application/gefahr/gefahr-application.module';
import { GefahrenmatrixController } from './controllers/gefahrenmatrix.controller';

/**
 * Modul für die Gefahrenmatrix im Einsatz-Kontext (Issue #414).
 *
 * Stellt REST-Endpunkte zum Abrufen und Aktualisieren
 * von Gefahrenbewertungen innerhalb eines Einsatzes bereit.
 */
@Module({
  imports: [GefahrApplicationModule],
  controllers: [GefahrenmatrixController],
})
export class GefahrModule {}
