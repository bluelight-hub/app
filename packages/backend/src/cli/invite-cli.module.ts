import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreateOneTimeInviteCliCommand } from '@/cli/commands';
import { CreateInviteHandler } from '@/application/admin/commands';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { InviteCodeInfrastructureModule } from '@/infrastructure/invite-code';
import { LOGGER, OUTBOX_REPOSITORY } from '@/infrastructure/di-tokens';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';
import { EventSerializer } from '@/infrastructure/outbox/event-serializer';
import { PrismaOutboxRepository } from '@/infrastructure/outbox/prisma-outbox.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    PrismaModule,
    InviteCodeInfrastructureModule,
  ],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('InviteCliModule'),
    },
    EventSerializer,
    PrismaOutboxRepository,
    {
      provide: OUTBOX_REPOSITORY,
      useExisting: PrismaOutboxRepository,
    },
    CreateInviteHandler,
    CreateOneTimeInviteCliCommand,
  ],
  exports: [CreateOneTimeInviteCliCommand],
})
export class InviteCliModule {}
