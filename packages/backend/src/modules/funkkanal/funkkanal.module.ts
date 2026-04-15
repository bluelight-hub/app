import { Module } from '@nestjs/common';
import { FunkkanalApplicationModule } from '@/application/funkkanal/funkkanal-application.module';
import { EinsatzInfrastructureModule } from '@/infrastructure/einsatz/einsatz-infrastructure.module';
import { FunkkanalInfrastructureModule } from '@/infrastructure/funkkanal/funkkanal-infrastructure.module';
import { FunkkanalController } from './funkkanal.controller';
import { KanalplanExportController } from './kanalplan-export.controller';
import { RufnameVorschlaegeController } from './rufname-vorschlaege.controller';
import { FunkkanalZuordnungController } from './zuordnung.controller';

/**
 * HTTP-Modul für den Funkkanal-Bounded-Context.
 *
 * Stellt CRUD-, Reorder-, Zuordnungs-, Rufnamen-Vorschlags- und PDF-Export-
 * Endpoints bereit.
 */
@Module({
  imports: [FunkkanalApplicationModule, FunkkanalInfrastructureModule, EinsatzInfrastructureModule],
  controllers: [FunkkanalController, FunkkanalZuordnungController, RufnameVorschlaegeController, KanalplanExportController],
})
export class FunkkanalModule {}
