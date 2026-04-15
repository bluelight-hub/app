import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { ALARMIERUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaAlarmierungRepository } from './prisma-alarmierung.repository';

/**
 * Infrastructure-Modul für das Alarmierung-Aggregat (Issue #408).
 *
 * Registriert den Prisma-Adapter für `IAlarmierungRepository` unter
 * `ALARMIERUNG_TOKENS.REPOSITORY` / `ALARMIERUNG_REPOSITORY` (Re-Export).
 *
 * Die zugehörigen Event-Adapter (WebSocket-Broadcast, FMS-Auto-Population)
 * werden im `EventAdaptersModule` registriert.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: ALARMIERUNG_REPOSITORY,
      useClass: PrismaAlarmierungRepository,
    },
  ],
  exports: [ALARMIERUNG_REPOSITORY],
})
export class AlarmierungInfrastructureModule {}
