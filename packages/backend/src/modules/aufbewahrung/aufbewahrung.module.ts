import { Module } from '@nestjs/common';
import { AufbewahrungApplicationModule } from '@/application/aufbewahrung/aufbewahrung-application.module';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { AufbewahrungController } from './controllers/aufbewahrung.controller';

/**
 * NestJS-Modul fuer DSGVO-Aufbewahrungsmanagement.
 *
 * Stellt die HTTP-API fuer Aufbewahrungskonfiguration,
 * Vorschau und Compliance-Reports bereit.
 *
 * **Architektur:**
 * - Controller: Thin HTTP Adapter
 * - Application Layer: AufbewahrungApplicationModule (Commands, Queries, Services, Repositories)
 *
 * @remarks Story 5.5
 */
@Module({
  imports: [AufbewahrungApplicationModule, PrismaModule],
  controllers: [AufbewahrungController],
})
export class AufbewahrungModule {}
