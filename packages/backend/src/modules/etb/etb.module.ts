import { CommonModule } from '@/common/common.module';
import { ConfigModule } from '@/config/config.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { EtbController } from './etb.controller';
import { EtbService } from './etb.service';

/**
 * Modul für das Einsatztagebuch (ETB).
 * Enthält Komponenten für die Verwaltung von ETB-Einträgen und deren Anlagen.
 */
@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        CommonModule
    ],
    controllers: [EtbController],
    providers: [EtbService],
    exports: [EtbService]
})
export class EtbModule { } 