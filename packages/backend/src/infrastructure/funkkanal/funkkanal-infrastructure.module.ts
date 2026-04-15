import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { FUNKKANAL_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaFunkkanalRepository } from './prisma-funkkanal.repository';

/**
 * Infrastructure-Modul für das Funkkanal-Aggregat (Issue #407).
 *
 * Registriert den Prisma-Adapter für `IFunkkanalRepository` und exportiert
 * das DI-Token, damit Application-Layer-Handler es via `@Inject(FUNKKANAL_REPOSITORY)`
 * auflösen können.
 *
 * WebSocket-Publisher (`EINSATZ_EVENT_PUBLISHER`) und PDF-Service
 * (`KANALPLAN_PDF_SERVICE`) werden in ihren jeweiligen Modulen (Task 18 / Task 23)
 * bereitgestellt; die Funkkanal-Event-Adapter binden sie optional.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: FUNKKANAL_REPOSITORY,
      useClass: PrismaFunkkanalRepository,
    },
  ],
  exports: [FUNKKANAL_REPOSITORY],
})
export class FunkkanalInfrastructureModule {}
