import { Module } from '@nestjs/common';
import { FunkkanalApplicationModule } from '@/application/funkkanal/funkkanal-application.module';
import { FunkkanalController } from './funkkanal.controller';
import { FunkkanalZuordnungController } from './zuordnung.controller';

/**
 * HTTP-Modul für den Funkkanal-Bounded-Context.
 *
 * Stellt CRUD-, Reorder- und Zuordnungs-Endpoints bereit. Rufnamen-Vorschläge
 * und PDF-Export folgen in den nächsten Tasks.
 */
@Module({
  imports: [FunkkanalApplicationModule],
  controllers: [FunkkanalController, FunkkanalZuordnungController],
})
export class FunkkanalModule {}
