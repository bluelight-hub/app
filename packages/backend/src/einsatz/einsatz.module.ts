import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { EinsatzController } from './einsatz.controller';
import { EinsatzRepository } from './einsatz.repository';
import { EinsatzService } from './einsatz.service';

/**
 * Einsatz-Modul für die Verwaltung von Einsätzen
 *
 * Features:
 * - CRUD-Operationen für Einsätze
 * - Automatische Namengenerierung
 * - Vollständigkeitsberechnung
 * - REST API mit Swagger-Dokumentation
 */
@Module({
  imports: [PrismaModule],
  controllers: [EinsatzController],
  providers: [EinsatzService, EinsatzRepository],
  exports: [EinsatzService],
})
export class EinsatzModule {}
