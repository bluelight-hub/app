import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import {
  AMPEL_PROJECTION_REPOSITORY,
  AMPEL_WARN_BADGE_READ_PORT,
  EIGENSCHUTZ_TELEMETRY_REPOSITORY,
  EIGENSCHUTZ_VORFALL_JSON_RENDERER,
  EIGENSCHUTZ_VORFALL_PDF_RENDERER,
  EIGENSCHUTZ_VORFALL_REPOSITORY,
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
  SICHERUNGSPOSTEN_REPOSITORY,
  SICHERUNGSPOSTEN_VERSION_REPOSITORY,
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
import { PrismaSicherungspostenRepository } from './repositories/prisma-sicherungsposten.repository';
import { PrismaSicherungspostenVersionRepository } from './repositories/prisma-sicherungsposten-version.repository';
import { PrismaEigenschutzTelemetryRepository } from './repositories/prisma-eigenschutz-telemetry.repository';
import { PrismaEigenschutzVorfallRepository } from './repositories/prisma-eigenschutz-vorfall.repository';
import { PrismaAmpelProjectionRepository } from './projections/prisma-ampel-projection.repository';
import { PrismaAmpelWarnBadgeReadRepository } from './repositories/prisma-ampel-warn-badge-read.repository';
import { EigenschutzVorfallPdfRenderer } from './export/eigenschutz-vorfall-pdf.renderer';
import { EigenschutzVorfallJsonRenderer } from './export/eigenschutz-vorfall-json.renderer';
import { PrometheusEigenschutzCollector } from './telemetry/prometheus-eigenschutz.collector';
import { TelemetryIngestService } from './telemetry/telemetry-ingest.service';
import { EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter } from './event-adapters/gefaehrdungsbeurteilung-erstellt.adapter';
import { EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter } from './event-adapters/gefaehrdungsbeurteilung-aktualisiert.adapter';
import { EigenschutzSicherheitsregelAusgerufenEventAdapter } from './event-adapters/sicherheitsregel-ausgerufen.adapter';
import { EigenschutzSicherheitsregelQuittiertEventAdapter } from './event-adapters/sicherheitsregel-quittiert.adapter';
import { EigenschutzPsaProfilGeaendertEventAdapter } from './event-adapters/psa-profil-geaendert.adapter';
import { EigenschutzQuittungAbgegebenEventAdapter } from './event-adapters/psa-quittung-abgegeben.adapter';
import { EigenschutzSicherungspostenEingerichtetEventAdapter } from './event-adapters/sicherungsposten-eingerichtet.adapter';
import { EigenschutzSicherungspostenAktualisiertEventAdapter } from './event-adapters/sicherungsposten-aktualisiert.adapter';
import { EigenschutzVorfallGemeldetEventAdapter } from './event-adapters/vorfall-gemeldet.adapter';
import { EigenschutzVorfallGeschlossenEventAdapter } from './event-adapters/vorfall-geschlossen.adapter';
import { EigenschutzVorfallExportiertEventAdapter } from './event-adapters/vorfall-exportiert.adapter';

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
    { provide: AMPEL_PROJECTION_REPOSITORY, useClass: PrismaAmpelProjectionRepository },
    { provide: AMPEL_WARN_BADGE_READ_PORT, useClass: PrismaAmpelWarnBadgeReadRepository },
    { provide: PSA_PROPAGATION_OVERDUE_QUERY, useClass: PrismaPsaPropagationOverdueQueryRepository },
    { provide: SYNC_CONFLICT_REPOSITORY, useClass: PrismaSyncConflictRepository },
    { provide: EIGENSCHUTZ_TELEMETRY_REPOSITORY, useClass: PrismaEigenschutzTelemetryRepository },
    { provide: SICHERUNGSPOSTEN_REPOSITORY, useClass: PrismaSicherungspostenRepository },
    { provide: SICHERUNGSPOSTEN_VERSION_REPOSITORY, useClass: PrismaSicherungspostenVersionRepository },
    { provide: EIGENSCHUTZ_VORFALL_REPOSITORY, useClass: PrismaEigenschutzVorfallRepository },
    { provide: EIGENSCHUTZ_VORFALL_PDF_RENDERER, useClass: EigenschutzVorfallPdfRenderer },
    { provide: EIGENSCHUTZ_VORFALL_JSON_RENDERER, useClass: EigenschutzVorfallJsonRenderer },
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
    EigenschutzSicherungspostenEingerichtetEventAdapter,
    EigenschutzSicherungspostenAktualisiertEventAdapter,
    EigenschutzVorfallGemeldetEventAdapter,
    EigenschutzVorfallGeschlossenEventAdapter,
    EigenschutzVorfallExportiertEventAdapter,
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
    AMPEL_PROJECTION_REPOSITORY,
    AMPEL_WARN_BADGE_READ_PORT,
    PSA_PROPAGATION_OVERDUE_QUERY,
    SYNC_CONFLICT_REPOSITORY,
    EIGENSCHUTZ_TELEMETRY_REPOSITORY,
    SICHERUNGSPOSTEN_REPOSITORY,
    SICHERUNGSPOSTEN_VERSION_REPOSITORY,
    EIGENSCHUTZ_VORFALL_REPOSITORY,
    EIGENSCHUTZ_VORFALL_PDF_RENDERER,
    EIGENSCHUTZ_VORFALL_JSON_RENDERER,
    TelemetryIngestService,
    PUSH_RECIPIENT_LOOKUP,
    EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter,
    EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter,
    EigenschutzSicherheitsregelAusgerufenEventAdapter,
    EigenschutzSicherheitsregelQuittiertEventAdapter,
    EigenschutzPsaProfilGeaendertEventAdapter,
    EigenschutzQuittungAbgegebenEventAdapter,
    EigenschutzSicherungspostenEingerichtetEventAdapter,
    EigenschutzSicherungspostenAktualisiertEventAdapter,
    EigenschutzVorfallGemeldetEventAdapter,
    EigenschutzVorfallGeschlossenEventAdapter,
    EigenschutzVorfallExportiertEventAdapter,
  ],
})
export class EigenschutzInfrastructureModule {}
