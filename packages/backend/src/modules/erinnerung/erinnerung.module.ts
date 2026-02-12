import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { InfrastructureCommonModule } from '@infrastructure/common.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { UserInfrastructureModule } from '@infrastructure/user/user-infrastructure.module';
import { KategorieModule } from '@/modules/kategorie/kategorie.module';
import { ERINNERUNG_REPOSITORY, PDF_EXPORT_SERVICE, CSV_EXPORT_SERVICE, JSON_EXPORT_SERVICE } from '@infrastructure/di-tokens';
import { PrismaErinnerungRepository } from '@infrastructure/repositories/prisma-erinnerung.repository';
import { CreateErinnerungHandler } from '@/application/erinnerung/commands/create-erinnerung/create-erinnerung.handler';
import { UpdateErinnerungHandler } from '@/application/erinnerung/commands/update-erinnerung/update-erinnerung.handler';
import { DeleteErinnerungHandler } from '@/application/erinnerung/commands/delete-erinnerung/delete-erinnerung.handler';
import { TriggerErinnerungHandler } from '@/application/erinnerung/commands/trigger-erinnerung/trigger-erinnerung.handler';
import { AcknowledgeErinnerungHandler } from '@/application/erinnerung/commands/acknowledge-erinnerung/acknowledge-erinnerung.handler';
import { SnoozeErinnerungHandler } from '@/application/erinnerung/commands/snooze-erinnerung/snooze-erinnerung.handler';
import { MarkErledigtErinnerungHandler } from '@/application/erinnerung/commands/mark-erledigt-erinnerung/mark-erledigt-erinnerung.handler';
import { AssignErinnerungHandler } from '@/application/erinnerung/commands/assign-erinnerung/assign-erinnerung.handler';
import { GetErinnerungenByEinsatzHandler } from '@/application/erinnerung/queries/get-erinnerungen-by-einsatz/get-erinnerungen-by-einsatz.handler';
import { GetErinnerungStatistikHandler } from '@/application/erinnerung/queries/get-erinnerung-statistik/get-erinnerung-statistik.handler';
import { GetPersonStatistikHandler } from '@/application/erinnerung/queries/get-person-statistik/get-person-statistik.handler';
import { GetEtbEntriesByErinnerungHandler } from '@/application/erinnerung/queries/get-etb-entries-by-erinnerung/get-etb-entries-by-erinnerung.handler';
import { GetZeitverlaufStatistikHandler } from '@/application/erinnerung/queries/get-zeitverlauf-statistik/get-zeitverlauf-statistik.handler';
import { GetEskalationsAnalyseHandler } from '@/application/erinnerung/queries/get-eskalations-analyse/get-eskalations-analyse.handler';
import { GetReaktionszeitStatistikHandler } from '@/application/erinnerung/queries/get-reaktionszeit-statistik/get-reaktionszeit-statistik.handler';
import { GetFuehrungsrhythmusStatistikHandler } from '@/application/erinnerung/queries/get-fuehrungsrhythmus-statistik/get-fuehrungsrhythmus-statistik.handler';
import { GetEinsatzVergleichHandler } from '@/application/erinnerung/queries/get-einsatz-vergleich/get-einsatz-vergleich.handler';
import { ExportErinnerungenHandler } from '@/application/erinnerung/queries/export-erinnerungen/export-erinnerungen.handler';
import { ExportRohdatenHandler } from '@/application/erinnerung/queries/export-rohdaten/export-rohdaten.handler';
import { PdfExportService } from '@infrastructure/export/pdf-export.service';
import { CsvExportService } from '@infrastructure/export/csv-export.service';
import { JsonExportService } from '@infrastructure/export/json-export.service';
import { EinsatzInfrastructureModule } from '@infrastructure/einsatz/einsatz-infrastructure.module';
import { GetErinnerungKonfigurationHandler } from '@application/erinnerung-konfiguration/queries/get-erinnerung-konfiguration.query';
import { UpdateEskalationsTimeoutHandler } from '@application/erinnerung-konfiguration/commands/update-eskalations-timeout.command';
import { ErinnerungKonfigurationController } from './controllers/erinnerung-konfiguration.controller';
import { IErinnerungKonfigurationRepository } from '@domain/erinnerung-konfiguration/repositories/erinnerung-konfiguration.repository.interface';
import { PrismaErinnerungKonfigurationRepository } from '@infrastructure/repositories/prisma-erinnerung-konfiguration.repository';
import { ErinnerungController } from './controllers/erinnerung.controller';
import { ErinnerungGateway } from './gateways/erinnerung.gateway';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';
import { ErinnerungResponseFactory } from '@/application/erinnerung/dto/erinnerung-response.factory';
import { EskaliereErinnerungHandler } from '@/application/erinnerung/commands/eskaliere-erinnerung/eskaliere-erinnerung.handler';
import { StopRecurringSeriesHandler } from '@/application/erinnerung/commands/stop-recurring-series/stop-recurring-series.handler';
import { ErinnerungWebSocketEventAdapter } from '@infrastructure/events/adapters/erinnerung-websocket-event.adapter';

@Module({
  imports: [
    PrismaModule,
    InfrastructureCommonModule,
    OutboxModule,
    UserInfrastructureModule,
    CqrsModule,
    // Story 8.2: KategorieModule für Kategorie-Daten in Query-Responses
    forwardRef(() => KategorieModule),
    // Story 9.6: EinsatzRepository für Status-Validierung im Export-Endpoint
    EinsatzInfrastructureModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [ErinnerungController, ErinnerungKonfigurationController],
  providers: [
    // Repository
    {
      provide: ERINNERUNG_REPOSITORY,
      useClass: PrismaErinnerungRepository,
    },
    {
      provide: IErinnerungKonfigurationRepository,
      useClass: PrismaErinnerungKonfigurationRepository,
    },
    // Handlers
    CreateErinnerungHandler,
    UpdateErinnerungHandler,
    DeleteErinnerungHandler,
    TriggerErinnerungHandler,
    AcknowledgeErinnerungHandler,
    SnoozeErinnerungHandler,
    MarkErledigtErinnerungHandler,
    AssignErinnerungHandler,
    GetErinnerungenByEinsatzHandler,
    GetErinnerungStatistikHandler,
    GetPersonStatistikHandler,
    GetEtbEntriesByErinnerungHandler,
    GetZeitverlaufStatistikHandler,
    // Escalation Analysis (Story 9.4)
    GetEskalationsAnalyseHandler,
    // Reaction Time Statistics (Story 9.5)
    GetReaktionszeitStatistikHandler,
    // Fuehrungsrhythmus Statistics (Story 9.8)
    GetFuehrungsrhythmusStatistikHandler,
    // Einsatz-Vergleich (Story 9.9)
    GetEinsatzVergleichHandler,
    // Configuration Handlers (Story 4.3)
    GetErinnerungKonfigurationHandler,
    UpdateEskalationsTimeoutHandler,
    // Stop Recurring Series (Story 6.5)
    StopRecurringSeriesHandler,
    // Escalation (Story 4.1)
    EskaliereErinnerungHandler,
    // Export (Story 9.6)
    ExportErinnerungenHandler,
    // Rohdaten-Export (Story 9.10)
    ExportRohdatenHandler,
    // Export Services (DI-Token basiert fuer Clean Architecture)
    {
      provide: PDF_EXPORT_SERVICE,
      useClass: PdfExportService,
    },
    {
      provide: CSV_EXPORT_SERVICE,
      useClass: CsvExportService,
    },
    {
      provide: JSON_EXPORT_SERVICE,
      useClass: JsonExportService,
    },
    // WebSocket (Story 1.5 AC4 + Security C1, C2, C3)
    ErinnerungGateway,
    WsJwtAuthGuard,
    ErinnerungWebSocketEventAdapter,
    // Utilities
    ErinnerungResponseFactory,
  ],
  exports: [
    ERINNERUNG_REPOSITORY,
    CreateErinnerungHandler,
    UpdateErinnerungHandler,
    DeleteErinnerungHandler,
    TriggerErinnerungHandler,
    AcknowledgeErinnerungHandler,
    SnoozeErinnerungHandler,
    MarkErledigtErinnerungHandler,
    AssignErinnerungHandler,
    GetErinnerungenByEinsatzHandler,
    ErinnerungGateway, // Export for WebSocket Event Adapter
    ErinnerungResponseFactory,
    GetZeitverlaufStatistikHandler,
  ],
})
export class ErinnerungModule {}
