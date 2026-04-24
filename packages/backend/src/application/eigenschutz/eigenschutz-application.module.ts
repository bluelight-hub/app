import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { EigenschutzInfrastructureModule } from '@/infrastructure/eigenschutz/eigenschutz-infrastructure.module';
import { KraefteInfrastructureModule } from '@/infrastructure/kraefte/kraefte-infrastructure.module';
import { UserInfrastructureModule } from '@/infrastructure/user/user-infrastructure.module';
import { CreateGefaehrdungsbeurteilungHandler } from './commands/create-gefaehrdungsbeurteilung/create-gefaehrdungsbeurteilung.handler';
import { UpdateGefaehrdungsbeurteilungItemsHandler } from './commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler';
import { GetGefaehrdungsbeurteilungHandler } from './queries/get-gefaehrdungsbeurteilung/get-gefaehrdungsbeurteilung.handler';
import { GetGefaehrdungsbeurteilungHistorieHandler } from './queries/get-gefaehrdungsbeurteilung-historie/get-gefaehrdungsbeurteilung-historie.handler';
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
 *
 * Story 2.4: `UserInfrastructureModule` wird importiert, damit der neue
 * {@link GetGefaehrdungsbeurteilungHistorieHandler} den `USER_REPOSITORY`-Port
 * zur Namens-Auflösung injizieren kann (Pattern analog zu
 * `NotizModule`/`EtbApplicationModule`).
 */
@Module({
  imports: [CqrsModule, PrismaModule, OutboxModule, EigenschutzInfrastructureModule, KraefteInfrastructureModule, UserInfrastructureModule],
  providers: [
    CreateGefaehrdungsbeurteilungHandler,
    UpdateGefaehrdungsbeurteilungItemsHandler,
    GetGefaehrdungsbeurteilungHandler,
    GetGefaehrdungsbeurteilungHistorieHandler,
    ListGefaehrdungsbeurteilungsVorlagenHandler,
  ],
  exports: [
    CreateGefaehrdungsbeurteilungHandler,
    UpdateGefaehrdungsbeurteilungItemsHandler,
    GetGefaehrdungsbeurteilungHandler,
    GetGefaehrdungsbeurteilungHistorieHandler,
    ListGefaehrdungsbeurteilungsVorlagenHandler,
  ],
})
export class EigenschutzApplicationModule {}
