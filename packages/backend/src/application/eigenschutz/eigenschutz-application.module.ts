import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { EigenschutzInfrastructureModule } from '@/infrastructure/eigenschutz/eigenschutz-infrastructure.module';
import { KraefteInfrastructureModule } from '@/infrastructure/kraefte/kraefte-infrastructure.module';
import { PushNotificationsModule } from '@infrastructure/push-notifications/push-notifications.module';
import { UserInfrastructureModule } from '@/infrastructure/user/user-infrastructure.module';
import { EinsatzTeilnehmerModule } from '@/modules/einsatz-teilnehmer/einsatz-teilnehmer.module';
import { EmitCriticalPushOnPsaProfilGeaendertHandler } from './event-handlers/emit-critical-push-on-psa-profil-geaendert.handler';
import { RecalculateAmpelProjectionOnEigenschutzEventHandler } from './event-handlers/recalculate-ampel-projection.handler';
import { AckPsaQuittungHandler } from './commands/ack-psa-quittung/ack-psa-quittung.handler';
import { AckSicherheitsregelHandler } from './commands/ack-sicherheitsregel/ack-sicherheitsregel.handler';
import { ChangePsaProfilHandler } from './commands/change-psa-profil/change-psa-profil.handler';
import { CreateGefaehrdungsbeurteilungHandler } from './commands/create-gefaehrdungsbeurteilung/create-gefaehrdungsbeurteilung.handler';
import { CreateSicherheitsregelHandler } from './commands/create-sicherheitsregel/create-sicherheitsregel.handler';
import { UpdateGefaehrdungsbeurteilungItemsHandler } from './commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler';
import { UpdateSicherheitsregelHandler } from './commands/update-sicherheitsregel/update-sicherheitsregel.handler';
import { GetGefaehrdungsbeurteilungHandler } from './queries/get-gefaehrdungsbeurteilung/get-gefaehrdungsbeurteilung.handler';
import { GetPsaProfileByEinheitHandler } from './queries/get-psa-profile-by-einheit/get-psa-profile-by-einheit.handler';
import { GetGefaehrdungsbeurteilungHistorieHandler } from './queries/get-gefaehrdungsbeurteilung-historie/get-gefaehrdungsbeurteilung-historie.handler';
import { GetSicherheitsregelHandler } from './queries/get-sicherheitsregel/get-sicherheitsregel.handler';
import { ListGefaehrdungsbeurteilungenHandler } from './queries/list-gefaehrdungsbeurteilungen/list-gefaehrdungsbeurteilungen.handler';
import { ListGefaehrdungsbeurteilungsVorlagenHandler } from './queries/list-gefaehrdungsbeurteilungs-vorlagen/list-gefaehrdungsbeurteilungs-vorlagen.handler';
import { ListOffenePsaBekanntgabenHandler } from './queries/list-offene-psa-bekanntgaben/list-offene-psa-bekanntgaben.handler';
import { ListOffeneRueckmeldungenHandler } from './queries/list-offene-rueckmeldungen/list-offene-rueckmeldungen.handler';
import { ListPsaQuittungenHandler } from './queries/list-psa-quittungen/list-psa-quittungen.handler';
import { ListSicherheitsregelnHandler } from './queries/list-sicherheitsregeln/list-sicherheitsregeln.handler';
import { ListSicherheitsregelQuittungenHandler } from './queries/list-sicherheitsregel-quittungen/list-sicherheitsregel-quittungen.handler';
import { MeldeLueckeHandler } from './commands/melde-luecke/melde-luecke.handler';
import { EmitPsaQuittungUeberfaelligHandler } from './commands/emit-psa-quittung-ueberfaellig/emit-psa-quittung-ueberfaellig.handler';
import { RebuildAmpelProjectionHandler } from './commands/rebuild-ampel-projection/rebuild-ampel-projection.handler';
import { ReportSyncConflictHandler } from './commands/report-sync-conflict/report-sync-conflict.handler';
import { ResolveKonfliktHandler } from './commands/resolve-konflikt/resolve-konflikt.handler';
import { ListSyncConflictsHandler } from './queries/list-sync-conflicts/list-sync-conflicts.handler';
import { CreateSicherungspostenHandler } from './commands/create-sicherungsposten/create-sicherungsposten.handler';
import { UpdateSicherungspostenHandler } from './commands/update-sicherungsposten/update-sicherungsposten.handler';
import { AufloeseSicherungspostenHandler } from './commands/aufloese-sicherungsposten/aufloese-sicherungsposten.handler';
import { GetSicherungspostenHandler } from './queries/get-sicherungsposten/get-sicherungsposten.handler';
import { ListSicherungspostenHandler } from './queries/list-sicherungsposten/list-sicherungsposten.handler';
import { ReportVorfallHandler } from './commands/report-vorfall/report-vorfall.handler';
import { CloseVorfallHandler } from './commands/close-vorfall/close-vorfall.handler';
import { AuditVorfallExportHandler } from './commands/audit-vorfall-export/audit-vorfall-export.handler';
import { KontextSnapshotBuilder } from './services/kontext-snapshot-builder';
import { GetVorfallByIdHandler } from './queries/get-vorfall-by-id/get-vorfall-by-id.handler';
import { ListVorfaelleHandler } from './queries/list-vorfaelle/list-vorfaelle.handler';
import { GetVorfallAuditTimelineHandler } from './queries/get-vorfall-audit-timeline/get-vorfall-audit-timeline.handler';
import { GetEigenschutzAmpelStatusHandler } from './queries/get-eigenschutz-ampel-status/get-eigenschutz-ampel-status.handler';
import { ListAmpelWarnBadgesHandler } from './queries/list-ampel-warn-badges/list-ampel-warn-badges.handler';
import { AmpelWarnBadgeService } from '@domain/eigenschutz/services/ampel-warn-badge.service';

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
  imports: [CqrsModule, PrismaModule, OutboxModule, EigenschutzInfrastructureModule, KraefteInfrastructureModule, PushNotificationsModule, UserInfrastructureModule, EinsatzTeilnehmerModule],
  providers: [
    AckPsaQuittungHandler,
    AckSicherheitsregelHandler,
    ChangePsaProfilHandler,
    CreateGefaehrdungsbeurteilungHandler,
    CreateSicherheitsregelHandler,
    EmitCriticalPushOnPsaProfilGeaendertHandler,
    RecalculateAmpelProjectionOnEigenschutzEventHandler,
    MeldeLueckeHandler,
    EmitPsaQuittungUeberfaelligHandler,
    RebuildAmpelProjectionHandler,
    ReportSyncConflictHandler,
    ResolveKonfliktHandler,
    UpdateGefaehrdungsbeurteilungItemsHandler,
    UpdateSicherheitsregelHandler,
    GetGefaehrdungsbeurteilungHandler,
    GetGefaehrdungsbeurteilungHistorieHandler,
    GetPsaProfileByEinheitHandler,
    GetSicherheitsregelHandler,
    ListGefaehrdungsbeurteilungenHandler,
    ListGefaehrdungsbeurteilungsVorlagenHandler,
    ListOffenePsaBekanntgabenHandler,
    ListOffeneRueckmeldungenHandler,
    ListPsaQuittungenHandler,
    ListSicherheitsregelnHandler,
    ListSicherheitsregelQuittungenHandler,
    ListSyncConflictsHandler,
    CreateSicherungspostenHandler,
    UpdateSicherungspostenHandler,
    AufloeseSicherungspostenHandler,
    GetSicherungspostenHandler,
    ListSicherungspostenHandler,
    ReportVorfallHandler,
    CloseVorfallHandler,
    AuditVorfallExportHandler,
    KontextSnapshotBuilder,
    GetVorfallByIdHandler,
    ListVorfaelleHandler,
    GetVorfallAuditTimelineHandler,
    GetEigenschutzAmpelStatusHandler,
    ListAmpelWarnBadgesHandler,
    AmpelWarnBadgeService,
  ],
  exports: [
    AckPsaQuittungHandler,
    AckSicherheitsregelHandler,
    ChangePsaProfilHandler,
    CreateGefaehrdungsbeurteilungHandler,
    CreateSicherheitsregelHandler,
    EmitCriticalPushOnPsaProfilGeaendertHandler,
    RecalculateAmpelProjectionOnEigenschutzEventHandler,
    MeldeLueckeHandler,
    EmitPsaQuittungUeberfaelligHandler,
    RebuildAmpelProjectionHandler,
    ReportSyncConflictHandler,
    ResolveKonfliktHandler,
    UpdateGefaehrdungsbeurteilungItemsHandler,
    UpdateSicherheitsregelHandler,
    GetGefaehrdungsbeurteilungHandler,
    GetGefaehrdungsbeurteilungHistorieHandler,
    GetPsaProfileByEinheitHandler,
    GetSicherheitsregelHandler,
    ListGefaehrdungsbeurteilungenHandler,
    ListGefaehrdungsbeurteilungsVorlagenHandler,
    ListOffenePsaBekanntgabenHandler,
    ListOffeneRueckmeldungenHandler,
    ListPsaQuittungenHandler,
    ListSicherheitsregelnHandler,
    ListSicherheitsregelQuittungenHandler,
    ListSyncConflictsHandler,
    CreateSicherungspostenHandler,
    UpdateSicherungspostenHandler,
    AufloeseSicherungspostenHandler,
    GetSicherungspostenHandler,
    ListSicherungspostenHandler,
    ReportVorfallHandler,
    CloseVorfallHandler,
    AuditVorfallExportHandler,
    GetVorfallByIdHandler,
    ListVorfaelleHandler,
    GetVorfallAuditTimelineHandler,
    GetEigenschutzAmpelStatusHandler,
    ListAmpelWarnBadgesHandler,
  ],
})
export class EigenschutzApplicationModule {}
