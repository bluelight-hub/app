import { Module } from '@nestjs/common';
import { FunkkanalApplicationModule } from '@/application/funkkanal/funkkanal-application.module';
import { FunkkanalController } from './funkkanal.controller';
import { RufnameVorschlaegeController } from './rufname-vorschlaege.controller';
import { FunkkanalZuordnungController } from './zuordnung.controller';

/**
 * HTTP-Modul für den Funkkanal-Bounded-Context.
 *
 * Stellt CRUD-, Reorder-, Zuordnungs- und Rufnamen-Vorschlags-Endpoints bereit.
 * PDF-Export folgt in Task 23.
 */
@Module({
  imports: [FunkkanalApplicationModule],
  controllers: [FunkkanalController, FunkkanalZuordnungController, RufnameVorschlaegeController],
})
export class FunkkanalModule {}
