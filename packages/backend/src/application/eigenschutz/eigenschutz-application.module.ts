import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { EigenschutzInfrastructureModule } from '@/infrastructure/eigenschutz/eigenschutz-infrastructure.module';
import { KraefteInfrastructureModule } from '@/infrastructure/kraefte/kraefte-infrastructure.module';
import { CreateGefaehrdungsbeurteilungHandler } from './commands/create-gefaehrdungsbeurteilung/create-gefaehrdungsbeurteilung.handler';
import { UpdateGefaehrdungsbeurteilungItemsHandler } from './commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler';
import { GetGefaehrdungsbeurteilungHandler } from './queries/get-gefaehrdungsbeurteilung/get-gefaehrdungsbeurteilung.handler';
import { ListGefaehrdungsbeurteilungsVorlagenHandler } from './queries/list-gefaehrdungsbeurteilungs-vorlagen/list-gefaehrdungsbeurteilungs-vorlagen.handler';

/**
 * Application-Layer-Modul des Eigenschutz-Feature-Slice (Story 2.1+).
 *
 * Registriert die Command- und Query-Handler und stellt sie via Dependency
 * Injection für den Controller bereit. Die Repository-Ports werden über
 * {@link EigenschutzInfrastructureModule} (Gefährdungsbeurteilung + Version +
 * Vorlage) und {@link KraefteInfrastructureModule} (Einsatz-Einheit) zur
 * Verfügung gestellt. Outbox + PrismaService kommen aus ihren Plattform-
 * Modulen (Transactional-Outbox-Pattern).
 */
@Module({
  imports: [CqrsModule, PrismaModule, OutboxModule, EigenschutzInfrastructureModule, KraefteInfrastructureModule],
  providers: [CreateGefaehrdungsbeurteilungHandler, UpdateGefaehrdungsbeurteilungItemsHandler, GetGefaehrdungsbeurteilungHandler, ListGefaehrdungsbeurteilungsVorlagenHandler],
  exports: [CreateGefaehrdungsbeurteilungHandler, UpdateGefaehrdungsbeurteilungItemsHandler, GetGefaehrdungsbeurteilungHandler, ListGefaehrdungsbeurteilungsVorlagenHandler],
})
export class EigenschutzApplicationModule {}
