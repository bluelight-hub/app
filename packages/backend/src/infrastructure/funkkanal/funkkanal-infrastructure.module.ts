import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { FUNKKANAL_REPOSITORY, KANALPLAN_PDF_SERVICE } from '@infrastructure/di-tokens';
import { KanalplanPdfService } from './kanalplan-pdf.service';
import { PrismaFunkkanalRepository } from './prisma-funkkanal.repository';

/**
 * Infrastructure-Modul für das Funkkanal-Aggregat (Issue #407).
 *
 * Registriert:
 * - den Prisma-Adapter für `IFunkkanalRepository`
 * - den pdfkit-basierten `KanalplanPdfService` unter `KANALPLAN_PDF_SERVICE`
 *
 * WebSocket-Publisher (`EINSATZ_EVENT_PUBLISHER`) wird im WebSocket-Modul
 * bereitgestellt; der Funkkanal-Event-Adapter bindet ihn optional.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: FUNKKANAL_REPOSITORY,
      useClass: PrismaFunkkanalRepository,
    },
    {
      provide: KANALPLAN_PDF_SERVICE,
      useClass: KanalplanPdfService,
    },
  ],
  exports: [FUNKKANAL_REPOSITORY, KANALPLAN_PDF_SERVICE],
})
export class FunkkanalInfrastructureModule {}
