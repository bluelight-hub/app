import { CommonModule } from '@/common/common.module';
import { ConfigModule } from '@/config/config.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { EtbController } from './etb.controller';
import { EtbService } from './etb.service';

/**
 * Modul für das Einsatztagebuch (ETB)
 *
 * Dieses Modul implementiert die vollständige Funktionalität für
 * die Verwaltung von Einsatztagebuch-Einträgen. Es bietet CRUD-Operationen
 * für ETB-Einträge sowie die Verwaltung von zugehörigen Anlagen.
 *
 * Features:
 * - Erstellung und Verwaltung von ETB-Einträgen
 * - Kategorisierung von Einträgen
 * - Anlagenverwaltung (Dokumente, Bilder, etc.)
 * - Filterung und Paginierung von Einträgen
 * - Integration mit dem Einsatz-Modul
 *
 * @module EtbModule
 */
@Module({
  imports: [ConfigModule, PrismaModule, CommonModule],
  controllers: [EtbController],
  providers: [EtbService],
  exports: [EtbService],
})
export class EtbModule {}
