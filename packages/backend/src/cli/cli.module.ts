import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AdminResetPasswordCommand, ArchiveOldEinsaetzeCliCommand } from '@/cli/commands';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';
import { LOGGER } from '@/infrastructure/di-tokens';
import { EinsatzApplicationModule } from '@application/einsatz/einsatz-application.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    EinsatzApplicationModule,
  ],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('CliModule'),
    },
    AdminResetPasswordCommand,
    ArchiveOldEinsaetzeCliCommand,
  ],
  exports: [AdminResetPasswordCommand, ArchiveOldEinsaetzeCliCommand],
})
export class CliModule {}
