import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EigenschutzApplicationModule } from '@/application/eigenschutz/eigenschutz-application.module';
import { EigenschutzInfrastructureModule } from '@/infrastructure/eigenschutz/eigenschutz-infrastructure.module';
import { KraefteInfrastructureModule } from '@/infrastructure/kraefte/kraefte-infrastructure.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { EigenschutzHealthController } from './controllers/eigenschutz-health.controller';
import { GefaehrdungsbeurteilungController } from './controllers/gefaehrdungsbeurteilung.controller';
import { SicherheitsregelController } from './controllers/sicherheitsregel.controller';

/**
 * HTTP-Modul für den Eigenschutz-Feature-Slice.
 *
 * Der Slice liefert Story 1.6 den Health-Endpoint
 * ({@link EigenschutzHealthController}) und ab Story 2.1 den
 * Gefährdungsbeurteilungs-Controller ({@link GefaehrdungsbeurteilungController}).
 * Das Modul ist bereits in `AppModule` registriert.
 *
 * ### Warum `KraefteInfrastructureModule`?
 *
 * Der via `AuthModule` gelieferte `EinsatzScopeGuard` hängt vom Provider
 * `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` ab, den nur
 * {@link KraefteInfrastructureModule} exportiert. NestJS löst die Guard-
 * Dependencies **im Modul-Kontext des Consumers** auf — deshalb muss das
 * Repository-Modul hier explizit importiert werden (analog zu Story 1.3).
 *
 * ### Weitere Module-Dependencies (Story 2.1)
 * - `CqrsModule`: CommandBus/QueryBus für den Controller.
 * - `EigenschutzApplicationModule`: Command-/Query-Handler.
 * - `EigenschutzInfrastructureModule`: Repositories + Event-Adapter.
 */
@Module({
  imports: [AuthModule, KraefteInfrastructureModule, CqrsModule, EigenschutzApplicationModule, EigenschutzInfrastructureModule],
  controllers: [EigenschutzHealthController, GefaehrdungsbeurteilungController, SicherheitsregelController],
})
export class EigenschutzModule {}
