import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { QualifikationenApplicationModule } from '@application/kraefte/qualifikationen/qualifikationen-application.module';
import { FahrzeugtypenApplicationModule } from '@application/kraefte/fahrzeugtypen/fahrzeugtypen-application.module';
import { RollenApplicationModule } from '@application/kraefte/rollen/rollen-application.module';
import { FunkStatusApplicationModule } from '@application/kraefte/funkstatus/funkstatus-application.module';
import { StammFahrzeugeApplicationModule } from '@application/kraefte/stamm-fahrzeuge/stamm-fahrzeuge-application.module';
import { StammPersonenApplicationModule } from '@application/kraefte/stamm-personen/stamm-personen-application.module';
import { EinsatzFahrzeugeApplicationModule } from '@application/kraefte/einsatz-fahrzeuge/einsatz-fahrzeuge-application.module';
import { EinsatzPersonenApplicationModule } from '@application/kraefte/einsatz-personen/einsatz-personen-application.module';
import { RollenBesetzungApplicationModule } from '@application/kraefte/rollen-besetzung/rollen-besetzung-application.module';
import { AdminQualifikationenController } from './controllers/admin-qualifikationen.controller';
import { AdminFahrzeugtypenController } from './controllers/admin-fahrzeugtypen.controller';
import { AdminRollenController } from './controllers/admin-rollen.controller';
import { AdminFunkStatusController } from './controllers/admin-funk-status.controller';
import { AdminStammFahrzeugeController } from './controllers/admin-stamm-fahrzeuge.controller';
import { AdminStammPersonenController } from './controllers/admin-stamm-personen.controller';
import { EinsatzFahrzeugeController } from './controllers/einsatz-fahrzeuge.controller';
import { EinsatzPersonenController } from './controllers/einsatz-personen.controller';
import { FahrzeugtypenController } from './controllers/fahrzeugtypen.controller';
import { StammFahrzeugeController } from './controllers/stamm-fahrzeuge.controller';
import { StammPersonenController } from './controllers/stamm-personen.controller';
import { RollenBesetzungController } from './controllers/rollen-besetzung.controller';
import { KraefteDashboardController } from './controllers/kraefte-dashboard.controller';

/**
 * NestJS Module für Kräftemanagement.
 *
 * Registriert Controller und importiert benötigte Module.
 */
@Module({
  imports: [
    // Auth Module für Guards und CurrentUser Decorator
    AuthModule,
    // Infrastructure Layer mit Repository Implementierungen
    KraefteInfrastructureModule,
    // Application Layer mit Command/Query Handlers
    QualifikationenApplicationModule,
    FahrzeugtypenApplicationModule,
    RollenApplicationModule,
    FunkStatusApplicationModule,
    StammFahrzeugeApplicationModule,
    StammPersonenApplicationModule,
    EinsatzFahrzeugeApplicationModule,
    EinsatzPersonenApplicationModule,
    RollenBesetzungApplicationModule,
  ],
  controllers: [
    AdminQualifikationenController,
    AdminFahrzeugtypenController,
    AdminRollenController,
    AdminFunkStatusController,
    AdminStammFahrzeugeController,
    AdminStammPersonenController,
    EinsatzFahrzeugeController,
    EinsatzPersonenController,
    FahrzeugtypenController,
    StammFahrzeugeController,
    StammPersonenController,
    RollenBesetzungController,
    KraefteDashboardController, // Story 6.1a: Taktische Stärke-Anzeige
  ],
})
export class KraefteModule {}
