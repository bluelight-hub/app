import { Module } from '@nestjs/common';
import { InfrastructureCommonModule } from '@infrastructure/common.module';
import { EinsatzBeitrittApplicationModule } from '@/application/einsatz-beitritt/einsatz-beitritt-application.module';
import { EinsatzBeitrittController } from './controllers/einsatz-beitritt.controller';

/**
 * Modul für Einsatz-Beitrittsanfragen (Issue #98).
 *
 * Ermöglicht Einsatzkräften das Stellen von Beitrittsanfragen
 * und Führungskräften deren Genehmigung/Ablehnung.
 */
@Module({
  imports: [InfrastructureCommonModule, EinsatzBeitrittApplicationModule],
  controllers: [EinsatzBeitrittController],
})
export class EinsatzBeitrittModule {}
