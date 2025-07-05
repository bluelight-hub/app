import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { EinsatzController } from './einsatz.controller';
import { EinsatzService } from './einsatz.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [EinsatzController],
  providers: [EinsatzService],
  exports: [EinsatzService],
})
export class EinsatzModule {}
