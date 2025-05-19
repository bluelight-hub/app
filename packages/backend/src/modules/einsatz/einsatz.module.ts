import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { EinsatzService } from './einsatz.service';
import { EinsatzController } from './einsatz.controller';

@Module({
    imports: [PrismaModule],
    controllers: [EinsatzController],
    providers: [EinsatzService],
    exports: [EinsatzService],
})
export class EinsatzModule {}
