import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConfigModule } from '@/config/config.module';
import { EinsatzService } from './einsatz.service';
import { EinsatzController } from './einsatz.controller';
import { DevSeedService } from './dev-seed.service';

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [EinsatzController],
    providers: [EinsatzService, DevSeedService],
    exports: [EinsatzService],
})
export class EinsatzModule {}
