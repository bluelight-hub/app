import { Module } from '@nestjs/common';
import { AlarmierungApplicationModule } from '@/application/alarmierung/alarmierung-application.module';
import { AlarmierungInfrastructureModule } from '@/infrastructure/alarmierung/alarmierung-infrastructure.module';
import { AlarmierungController } from './alarmierung.controller';
import { AlarmierungEmpfaengerController } from './empfaenger.controller';

/**
 * HTTP-Modul für den Alarmierung-Bounded-Context (Issue #408).
 *
 * Stellt die REST-Endpoints unter
 * `/einsatz/:einsatzId/alarmierungen[...]` bereit:
 * - CRUD + Abschluss + Nachalarmierung auf Alarmierungs-Ebene
 * - Hinzufügen / Entfernen / Zeitpunkt-Korrektur auf Empfänger-Ebene
 */
@Module({
  imports: [AlarmierungApplicationModule, AlarmierungInfrastructureModule],
  controllers: [AlarmierungController, AlarmierungEmpfaengerController],
})
export class AlarmierungModule {}
