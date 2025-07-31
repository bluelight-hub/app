import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { EinsatzController } from './einsatz.controller';
import { EinsatzService } from './einsatz.service';

/**
 * Modul für die Einsatzverwaltung
 *
 * Dieses Modul implementiert die zentrale Geschäftslogik für
 * die Verwaltung von Einsätzen im Bluelight Hub System.
 * Es bietet Funktionalitäten zur Erstellung, Bearbeitung
 * und Verwaltung von Einsätzen.
 *
 * Features:
 * - CRUD-Operationen für Einsätze
 * - Einsatzstatusmanagement
 * - Integration mit anderen Modulen (ETB, Audit)
 * - Berechtigungsbasierte Zugriffskontrolle
 *
 * @module EinsatzModule
 */
@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [EinsatzController],
  providers: [EinsatzService],
  exports: [EinsatzService],
})
export class EinsatzModule {}
