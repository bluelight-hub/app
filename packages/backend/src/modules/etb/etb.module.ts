import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { LOGGER } from '@/infrastructure/di-tokens';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';
import { EtbApplicationModule } from '@/application/etb/etb-application.module';
import { EtbInfrastructureModule } from '@/infrastructure/etb/etb-infrastructure.module';
import { EinsatzInfrastructureModule } from '@/infrastructure/einsatz/einsatz-infrastructure.module';
import { EinsatzTeilnehmerModule } from '@/modules/einsatz-teilnehmer/einsatz-teilnehmer.module';
import { EtbCqrsController } from './controllers/etb-cqrs.controller';

/**
 * EtbModule - Einsatztagebuch Feature Module (Hexagonal Architecture).
 *
 * **Architektur (Story 5-1):**
 * - Controller nutzt ausschließlich CQRS Handler (CommandBus/QueryBus Pattern)
 * - Alle Business-Logik in Application Layer (EtbApplicationModule)
 * - Infrastructure via EtbInfrastructureModule (IEtbRepository)
 * - Teilnehmer-Prüfung via IEinsatzTeilnehmerRepository (EinsatzTeilnehmerModule)
 * - Rollen-Prüfung via IEinsatzRollenReadRepository (EinsatzInfrastructureModule)
 *
 * **Handler Injection Pattern (statt CqrsModule):**
 * Controller injiziert Handler direkt via DI, da Handler als @Injectable() registriert sind.
 * Dies vereinfacht das Setup und vermeidet die Notwendigkeit für @CommandHandler/@QueryHandler Dekoratoren.
 */
@Module({
  imports: [
    PrismaModule,
    EtbApplicationModule, // Registers all ETB Command/Query Handlers (inkl. GetErinnerungTimelineQueryHandler Story 5.5)
    EtbInfrastructureModule, // Provides IEtbRepository for Controller
    EinsatzTeilnehmerModule, // Provides IEinsatzTeilnehmerRepository for Teilnehmer-Prüfung
    EinsatzInfrastructureModule, // Provides IEinsatzRollenReadRepository for Rollen-Prüfung
  ],
  controllers: [EtbCqrsController],
  providers: [
    // Logger für EtbModule Guards/Services
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EtbModule'),
    },
  ],
  exports: [],
})
export class EtbModule {}
