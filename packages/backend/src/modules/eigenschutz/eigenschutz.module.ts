import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EigenschutzApplicationModule } from '@/application/eigenschutz/eigenschutz-application.module';
import { EigenschutzInfrastructureModule } from '@/infrastructure/eigenschutz/eigenschutz-infrastructure.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { EigenschutzHealthController } from './controllers/eigenschutz-health.controller';
import { GefaehrdungsbeurteilungController } from './controllers/gefaehrdungsbeurteilung.controller';
import { PsaProfilController } from './controllers/psa-profil.controller';
import { SicherheitsregelController } from './controllers/sicherheitsregel.controller';
import { SyncConflictController } from './controllers/sync-conflict.controller';
import { EigenschutzTelemetryController } from './controllers/eigenschutz-telemetry.controller';
import { SicherungspostenController } from './controllers/sicherungsposten.controller';
import { EigenschutzVorfallController } from './controllers/eigenschutz-vorfall.controller';
import { EigenschutzAmpelController } from './controllers/eigenschutz-ampel.controller';

/**
 * HTTP-Modul für den Eigenschutz-Feature-Slice.
 *
 * Der Slice liefert Story 1.6 den Health-Endpoint
 * ({@link EigenschutzHealthController}) und ab Story 2.1 den
 * Gefährdungsbeurteilungs-Controller ({@link GefaehrdungsbeurteilungController}).
 * Das Modul ist bereits in `AppModule` registriert.
 *
 * ### Modul-Dependencies
 *
 * - `AuthModule`: liefert `JwtAuthGuard`, `EinsatzScopeGuard`,
 *   `PermissionsGuard` und transitiv das
 *   `KraefteInfrastructureModule` (ADR-014: Single-Import-Konvention).
 * - `CqrsModule`: CommandBus/QueryBus für den Controller.
 * - `EigenschutzApplicationModule`: Command-/Query-Handler.
 * - `EigenschutzInfrastructureModule`: Repositories + Event-Adapter.
 */
@Module({
  imports: [AuthModule, CqrsModule, EigenschutzApplicationModule, EigenschutzInfrastructureModule],
  controllers: [
    EigenschutzHealthController,
    GefaehrdungsbeurteilungController,
    SicherheitsregelController,
    PsaProfilController,
    SyncConflictController,
    EigenschutzTelemetryController,
    SicherungspostenController,
    EigenschutzVorfallController,
    EigenschutzAmpelController,
  ],
})
export class EigenschutzModule {}
