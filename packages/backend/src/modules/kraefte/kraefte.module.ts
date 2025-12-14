import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { QualifikationenApplicationModule } from '@application/kraefte/qualifikationen/qualifikationen-application.module';
import { AdminQualifikationenController } from './controllers/admin-qualifikationen.controller';

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
  ],
  controllers: [AdminQualifikationenController],
})
export class KraefteModule {}
