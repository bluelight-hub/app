import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EtbController } from './etb.controller';
import { EtbService } from './etb.service';
import { EtbRepository } from './etb.repository';

@Module({
  imports: [PrismaModule],
  controllers: [EtbController],
  providers: [EtbService, EtbRepository],
  exports: [EtbService],
})
export class EtbModule {}
