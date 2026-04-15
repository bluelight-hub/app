import { Module } from '@nestjs/common';
import { FunkkanalApplicationModule } from '@/application/funkkanal/funkkanal-application.module';
import { FunkkanalController } from './funkkanal.controller';

/**
 * HTTP-Modul für den Funkkanal-Bounded-Context.
 *
 * Stellt CRUD- und Reorder-Endpoints für Funkkanäle eines Einsatzes bereit.
 * Zuordnungs- und Rufnamen-Vorschlags-Controller folgen in den nächsten Tasks.
 */
@Module({
  imports: [FunkkanalApplicationModule],
  controllers: [FunkkanalController],
})
export class FunkkanalModule {}
