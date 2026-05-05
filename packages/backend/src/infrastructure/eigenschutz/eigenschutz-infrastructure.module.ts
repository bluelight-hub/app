import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import {
  EIGENSCHUTZ_TELEMETRY_REPOSITORY,
  GEFAEHRDUNGSBEURTEILUNG_REPOSITORY,
  GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY,
  GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY,
  LOGGER,
  PSA_PROFIL_QUITTUNG_REPOSITORY,
  PSA_PROPAGATION_OVERDUE_QUERY,
  PSA_PROFIL_ZUWEISUNG_READ_REPOSITORY,
  PSA_PROFIL_ZUWEISUNG_REPOSITORY,
  PUSH_RECIPIENT_LOOKUP,
  SICHERHEITSREGEL_QUITTUNG_REPOSITORY,
  SICHERHEITSREGEL_REPOSITORY,
  SICHERHEITSREGEL_VERSION_REPOSITORY,
  SYNC_CONFLICT_REPOSITORY,
} from '@infrastructure/di-tokens';
import { WebsocketModule } from '@infrastructure/websocket/websocket.module';
import { PrismaGefaehrdungsbeurteilungRepository } from './repositories/prisma-gefaehrdungsbeurteilung.repository';
import { PrismaGefaehrdungsbeurteilungVersionRepository } from './repositories/prisma-gefaehrdungsbeurteilung-version.repository';
import { PrismaGefaehrdungsbeurteilungVorlageRepository } from './repositories/prisma-gefaehrdungsbeurteilung-vorlage.repository';
import { PrismaSicherheitsregelRepository } from './repositories/prisma-sicherheitsregel.repository';
import { PrismaSicherheitsregelVersionRepository } from './repositories/prisma-sicherheitsregel-version.repository';
import { PrismaSicherheitsregelQuittungRepository } from './repositories/prisma-sicherheitsregel-quittung.repository';
import { PrismaPsaProfilZuweisungRepository } from './repositories/prisma-psa-profil-zuweisung.repository';
import { PrismaPsaProfilQuittungRepository } from './repositories/prisma-psa-profil-quittung.repository';
import { PrismaPsaPropagationOverdueQueryRepository } from './repositories/prisma-psa-propagation-overdue-query.repository';
import { PrismaPushRecipientLookupRepository } from './repositories/prisma-push-recipient-lookup.repository';
import { PrismaSyncConflictRepository } from './repositories/prisma-sync-conflict.repository';
import { PrismaEigenschutzTelemetryRepository } from './repositories/prisma-eigenschutz-telemetry.repository';
import { PrometheusEigenschutzCollector } from './telemetry/prometheus-eigenschutz.collector';
import { TelemetryIngestService } from './telemetry/telemetry-ingest.service';
import { EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter } from './event-adapters/gefaehrdungsbeurteilung-erstellt.adapter';
import { EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter } from './event-adapters/gefaehrdungsbeurteilung-aktualisiert.adapter';
import { EigenschutzSicherheitsregelAusgerufenEventAdapter } from './event-adapters/sicherheitsregel-ausgerufen.adapter';
import { EigenschutzSicherheitsregelQuittiertEventAdapter } from './event-adapters/sicherheitsregel-quittiert.adapter';
import { EigenschutzPsaProfilGeaendertEventAdapter } from './event-adapters/psa-profil-geaendert.adapter';
import { EigenschutzQuittungAbgegebenEventAdapter } from './event-adapters/psa-quittung-abgegeben.adapter';

/**
 * Infrastructure-Modul des Eigenschutz-Feature-Slice (Story 2.1+).
 *
 * Stellt die Prisma-Repositories für Gefährdungsbeurteilung (Stories 2.1–2.4)
 * und Sicherheitsregel (Story 2.6) bereit und registriert die zugehörigen
 * Log-Adapter. Das Modul wird von `EigenschutzModule` importiert; eine
 * Direkt-Registrierung in `AppModule` ist nicht nötig.
 */
@Module({
  imports: [PrismaModule, WebsocketModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EigenschutzInfrastructure'),
    },
    { provide: GEFAEHRDUNGSBEURTEILUNG_REPOSITORY, useClass: PrismaGefaehrdungsbeurteilungRepository },
    { provide: GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY, useClass: PrismaGefaehrdungsbeurteilungVersionRepository },
    { provide: GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY, useClass: PrismaGefaehrdungsbeurteilungVorlageRepository },
    { provide: SICHERHEITSREGEL_REPOSITORY, useClass: PrismaSicherheitsregelRepository },
    { provide: SICHERHEITSREGEL_VERSION_REPOSITORY, useClass: PrismaSicherheitsregelVersionRepository },
    { provide: SICHERHEITSREGEL_QUITTUNG_REPOSITORY, useClass: PrismaSicherheitsregelQuittungRepository },
    { provide: PSA_PROFIL_ZUWEISUNG_REPOSITORY, useClass: PrismaPsaProfilZuweisungRepository },
    { provide: PSA_PROFIL_ZUWEISUNG_READ_REPOSITORY, useClass: PrismaPsaProfilZuweisungRepository },
    { provide: PSA_PROFIL_QUITTUNG_REPOSITORY, useClass: PrismaPsaProfilQuittungRepository },
    { provide: PSA_PROPAGATION_OVERDUE_QUERY, useClass: PrismaPsaPropagationOverdueQueryRepository },
    { provide: SYNC_CONFLICT_REPOSITORY, useClass: PrismaSyncConflictRepository },
    { provide: EIGENSCHUTZ_TELEMETRY_REPOSITORY, useClass: PrismaEigenschutzTelemetryRepository },
    PrometheusEigenschutzCollector,
    TelemetryIngestService,
    PrismaPushRecipientLookupRepository,
    { provide: PUSH_RECIPIENT_LOOKUP, useExisting: PrismaPushRecipientLookupRepository },
    EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter,
    EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter,
    EigenschutzSicherheitsregelAusgerufenEventAdapter,
    EigenschutzSicherheitsregelQuittiertEventAdapter,
    EigenschutzPsaProfilGeaendertEventAdapter,
    EigenschutzQuittungAbgegebenEventAdapter,
  ],
  exports: [
    GEFAEHRDUNGSBEURTEILUNG_REPOSITORY,
    GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY,
    GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY,
    SICHERHEITSREGEL_REPOSITORY,
    SICHERHEITSREGEL_VERSION_REPOSITORY,
    SICHERHEITSREGEL_QUITTUNG_REPOSITORY,
    PSA_PROFIL_ZUWEISUNG_REPOSITORY,
    PSA_PROFIL_ZUWEISUNG_READ_REPOSITORY,
    PSA_PROFIL_QUITTUNG_REPOSITORY,
    PSA_PROPAGATION_OVERDUE_QUERY,
    SYNC_CONFLICT_REPOSITORY,
    EIGENSCHUTZ_TELEMETRY_REPOSITORY,
    TelemetryIngestService,
    PUSH_RECIPIENT_LOOKUP,
    EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter,
    EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter,
    EigenschutzSicherheitsregelAusgerufenEventAdapter,
    EigenschutzSicherheitsregelQuittiertEventAdapter,
    EigenschutzPsaProfilGeaendertEventAdapter,
    EigenschutzQuittungAbgegebenEventAdapter,
  ],
})
export class EigenschutzInfrastructureModule {}
