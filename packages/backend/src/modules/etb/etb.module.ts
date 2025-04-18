import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtbAttachment } from './entities/etb-attachment.entity';
import { EtbEntry } from './entities/etb-entry.entity';
import { EtbController } from './etb.controller';
import { EtbService } from './etb.service';

/**
 * Modul für das Einsatztagebuch (ETB).
 * Enthält Komponenten für die Verwaltung von ETB-Einträgen und deren Anlagen.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([EtbEntry, EtbAttachment])
    ],
    controllers: [EtbController],
    providers: [EtbService],
    exports: [EtbService]
})
export class EtbModule { } 