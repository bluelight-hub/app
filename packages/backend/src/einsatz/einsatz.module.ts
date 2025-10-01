import { PrismaModule } from '@/prisma/prisma.module';
import { Module, forwardRef, OnModuleInit, Inject } from '@nestjs/common';
import { EinsatzController } from './einsatz.controller';
import { EinsatzRepository } from './einsatz.repository';
import { EinsatzService } from './einsatz.service';
import { EtbModule } from '@/etb/etb.module';
import { EtbService } from '@/etb/etb.service';

/**
 * Einsatz-Modul für die Verwaltung von Einsätzen
 *
 * Features:
 * - CRUD-Operationen für Einsätze
 * - Automatische Namengenerierung
 * - Vollständigkeitsberechnung
 * - Automatische ETB-Erstellung bei Einsatz-Erstellung
 * - REST API mit Swagger-Dokumentation
 */
@Module({
  imports: [PrismaModule, forwardRef(() => EtbModule)],
  controllers: [EinsatzController],
  providers: [EinsatzService, EinsatzRepository],
  exports: [EinsatzService],
})
export class EinsatzModule implements OnModuleInit {
  constructor(
    private readonly einsatzService: EinsatzService,
    @Inject(forwardRef(() => EtbService))
    private readonly etbService: EtbService,
  ) {}

  onModuleInit() {
    // Inject ETB Service nach Module-Initialisierung (Circular Dependency Workaround)
    this.einsatzService.setEtbService(this.etbService);
  }
}
