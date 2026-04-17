import { Module } from '@nestjs/common';
import { GefahrApplicationModule } from '@/application/gefahr/gefahr-application.module';
import { GefahrenmatrixController } from './controllers/gefahrenmatrix.controller';
import { GefahrenzoneController } from './controllers/gefahrenzone.controller';

/**
 * Modul für Gefahrenmatrix (Issue #414) und Gefahrenzonen (Issue #627) im Einsatz-Kontext.
 */
@Module({
  imports: [GefahrApplicationModule],
  controllers: [GefahrenmatrixController, GefahrenzoneController],
})
export class GefahrModule {}
