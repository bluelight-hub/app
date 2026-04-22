import { Module } from '@nestjs/common';
import { KraefteInfrastructureModule } from '@/infrastructure/kraefte/kraefte-infrastructure.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { EigenschutzHealthController } from './controllers/eigenschutz-health.controller';

/**
 * HTTP-Modul für den Eigenschutz-Feature-Slice (Story 1.6).
 *
 * Aktuell exponiert der Slice nur den Health-Endpoint
 * ({@link EigenschutzHealthController}) als Smoke-Test-Einsprungspunkt.
 * Epic 2–5 ergänzt fachliche Controller + Application-Handler. Solange es
 * keine eigenen Provider gibt, bleibt das Infrastructure-Geschwister-Modul
 * ungenutzt und wird **nicht** in {@link AppModule} importiert.
 *
 * ### Warum `KraefteInfrastructureModule`?
 *
 * Der via `AuthModule` gelieferte `EinsatzScopeGuard` hängt vom Provider
 * `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` ab, den nur
 * {@link KraefteInfrastructureModule} exportiert. NestJS löst die Guard-
 * Dependencies **im Modul-Kontext des Consumers** auf — deshalb muss das
 * Repository-Modul hier explizit importiert werden. (Alternative wäre ein
 * Plattform-Re-Export aus `AuthModule`; Story 1.6 hält den Scope lokal,
 * analog zu Story 1.3.)
 */
@Module({
  imports: [AuthModule, KraefteInfrastructureModule],
  controllers: [EigenschutzHealthController],
})
export class EigenschutzModule {}
