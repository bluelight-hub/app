import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { AlarmierungId } from '@domain/value-objects/alarmierung-id';

/**
 * Status einer Alarmierung.
 * - `aktiv`          — Empfänger noch im laufenden Alarmierungs-Prozess
 * - `abgeschlossen`  — manuell geschlossen, alle Empfänger wieder frei
 */
export type AlarmierungStatus = 'aktiv' | 'abgeschlossen';

export const ALARMIERUNG_STATUS_VALUES: readonly AlarmierungStatus[] = ['aktiv', 'abgeschlossen'];

/**
 * Root-Entity des Alarmierung-Aggregats (Issue #408).
 *
 * Stammdaten einer Alarmierung. Empfänger liegen als Child-Entities
 * (`AlarmierungEmpfaenger`) daneben und werden vom `AlarmierungAggregate`
 * verwaltet.
 *
 * Nachalarmierung: `ursprungAlarmierungId` referenziert den Ursprungsalarm.
 */
export class Alarmierung {
  constructor(
    public readonly id: AlarmierungId,
    public readonly einsatzId: EinsatzId,
    public bezeichnung: string,
    public beschreibung: string | undefined,
    public readonly alarmierungszeit: Date,
    public status: AlarmierungStatus,
    public readonly ursprungAlarmierungId: AlarmierungId | undefined,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public readonly createdBy: string,
    public updatedBy: string | undefined,
  ) {}
}
