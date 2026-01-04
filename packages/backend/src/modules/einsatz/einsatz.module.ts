import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { LOGGER } from '@/infrastructure/di-tokens';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EinsatzApplicationModule } from '@/application/einsatz/einsatz-application.module';
import { EinsatzInfrastructureModule } from '@/infrastructure/einsatz/einsatz-infrastructure.module';
import { EinsatzController } from './controllers/einsatz.controller';

/**
 * Einsatz-Modul für die Verwaltung von Einsätzen (Hexagonal Architecture)
 *
 * Features:
 * - CQRS Command/Query Handlers für alle Operationen
 * - Automatische Namengenerierung (via Utilities)
 * - Vollständigkeitsberechnung (via Query Handlers)
 * - Event-basierte Kommunikation (Domain Events)
 * - REST API mit Swagger-Dokumentation
 *
 * **Architektur (Story 5-1):**
 * - Controller nutzt ausschließlich CommandBus/QueryBus
 * - Alle Business-Logik in Application Layer (EinsatzApplicationModule)
 * - Infrastructure via EinsatzInfrastructureModule (Repositories)
 *
 * **Module-Dependencies:**
 * - CqrsModule: Stellt CommandBus/QueryBus bereit (für Controller)
 * - PrismaModule: Expliziter Import nötig, da NestJS Module nicht transitiv sind
 *   (EinsatzApplicationModule → PrismaModule gilt nicht für EinsatzModule)
 * - EinsatzApplicationModule: Command/Query Handlers
 * - EinsatzInfrastructureModule: Repository Implementierungen
 *
 * @remarks
 * Die Kommunikation mit anderen Modulen erfolgt über
 * Domain-Events (Transactional Outbox Pattern).
 */
@Module({
  imports: [CqrsModule, PrismaModule, EinsatzApplicationModule, EinsatzInfrastructureModule],
  controllers: [EinsatzController],
  providers: [
    // Logger für EinsatzModule Guards/Services
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EinsatzModule'),
    },
  ],
  exports: [],
})
export class EinsatzModule {}
