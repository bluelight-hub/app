import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@/auth/auth.module';
import { AdminResetPasswordCommand } from '@/cli/commands';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    PrismaModule,
    AuthModule,
  ],
  providers: [AdminResetPasswordCommand],
  exports: [AdminResetPasswordCommand],
})
export class CliModule {}
