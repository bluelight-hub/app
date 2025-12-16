import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { QualifikationenApplicationModule } from '@application/kraefte/qualifikationen/qualifikationen-application.module';
import { FahrzeugtypenApplicationModule } from '@application/kraefte/fahrzeugtypen/fahrzeugtypen-application.module';
import { RollenApplicationModule } from '@application/kraefte/rollen/rollen-application.module';
import { AdminQualifikationenController } from './controllers/admin-qualifikationen.controller';
import { AdminFahrzeugtypenController } from './controllers/admin-fahrzeugtypen.controller';
import { AdminRollenController } from './controllers/admin-rollen.controller';

/**
 * NestJS Module für Kräftemanagement.
 *
 * Registriert Controller und importiert benötigte Module.
 */
@Module({
  imports: [
    // Auth Module für Guards und CurrentUser Decorator
    AuthModule,
    // Application Layer mit Command/Query Handlers
    QualifikationenApplicationModule,
    FahrzeugtypenApplicationModule,
    RollenApplicationModule,
  ],
  controllers: [AdminQualifikationenController, AdminFahrzeugtypenController, AdminRollenController],
})
export class KraefteModule {}
