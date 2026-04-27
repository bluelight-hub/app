import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { EigenschutzInfrastructureModule } from '@/infrastructure/eigenschutz/eigenschutz-infrastructure.module';
import { KraefteInfrastructureModule } from '@/infrastructure/kraefte/kraefte-infrastructure.module';
import { UserInfrastructureModule } from '@/infrastructure/user/user-infrastructure.module';
import { EinsatzTeilnehmerModule } from '@/modules/einsatz-teilnehmer/einsatz-teilnehmer.module';
import { AckSicherheitsregelHandler } from './commands/ack-sicherheitsregel/ack-sicherheitsregel.handler';
import { CreateGefaehrdungsbeurteilungHandler } from './commands/create-gefaehrdungsbeurteilung/create-gefaehrdungsbeurteilung.handler';
import { CreateSicherheitsregelHandler } from './commands/create-sicherheitsregel/create-sicherheitsregel.handler';
import { UpdateGefaehrdungsbeurteilungItemsHandler } from './commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler';
import { UpdateSicherheitsregelHandler } from './commands/update-sicherheitsregel/update-sicherheitsregel.handler';
import { GetGefaehrdungsbeurteilungHandler } from './queries/get-gefaehrdungsbeurteilung/get-gefaehrdungsbeurteilung.handler';
import { GetGefaehrdungsbeurteilungHistorieHandler } from './queries/get-gefaehrdungsbeurteilung-historie/get-gefaehrdungsbeurteilung-historie.handler';
import { GetSicherheitsregelHandler } from './queries/get-sicherheitsregel/get-sicherheitsregel.handler';
import { ListGefaehrdungsbeurteilungenHandler } from './queries/list-gefaehrdungsbeurteilungen/list-gefaehrdungsbeurteilungen.handler';
import { ListGefaehrdungsbeurteilungsVorlagenHandler } from './queries/list-gefaehrdungsbeurteilungs-vorlagen/list-gefaehrdungsbeurteilungs-vorlagen.handler';
import { ListSicherheitsregelnHandler } from './queries/list-sicherheitsregeln/list-sicherheitsregeln.handler';
import { ListSicherheitsregelQuittungenHandler } from './queries/list-sicherheitsregel-quittungen/list-sicherheitsregel-quittungen.handler';

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
  imports: [CqrsModule, PrismaModule, OutboxModule, EigenschutzInfrastructureModule, KraefteInfrastructureModule, UserInfrastructureModule, EinsatzTeilnehmerModule],
  providers: [
    AckSicherheitsregelHandler,
    CreateGefaehrdungsbeurteilungHandler,
    CreateSicherheitsregelHandler,
    UpdateGefaehrdungsbeurteilungItemsHandler,
    UpdateSicherheitsregelHandler,
    GetGefaehrdungsbeurteilungHandler,
    GetGefaehrdungsbeurteilungHistorieHandler,
    GetSicherheitsregelHandler,
    ListGefaehrdungsbeurteilungenHandler,
    ListGefaehrdungsbeurteilungsVorlagenHandler,
    ListSicherheitsregelnHandler,
    ListSicherheitsregelQuittungenHandler,
  ],
  exports: [
    AckSicherheitsregelHandler,
    CreateGefaehrdungsbeurteilungHandler,
    CreateSicherheitsregelHandler,
    UpdateGefaehrdungsbeurteilungItemsHandler,
    UpdateSicherheitsregelHandler,
    GetGefaehrdungsbeurteilungHandler,
    GetGefaehrdungsbeurteilungHistorieHandler,
    GetSicherheitsregelHandler,
    ListGefaehrdungsbeurteilungenHandler,
    ListGefaehrdungsbeurteilungsVorlagenHandler,
    ListSicherheitsregelnHandler,
    ListSicherheitsregelQuittungenHandler,
  ],
})
export class EigenschutzApplicationModule {}
