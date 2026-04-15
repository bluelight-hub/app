import type { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import type { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import type { AlarmierungEmpfaengerRef } from './alarmierung-empfaenger-ref';

/**
 * Das Feld eines Zeitpunkts im Alarmierungs-Lifecycle.
 *
 * `alarmiertAm` wird beim Hinzufügen gesetzt, die drei weiteren Felder
 * werden entweder automatisch aus FMS-Statuswechseln abgeleitet oder
 * manuell nachgetragen.
 */
export type ZeitpunktFeld = 'ausgeruecktAm' | 'vorOrtAm' | 'wiederFreiAm';

export const ZEITPUNKT_FELDER: readonly ZeitpunktFeld[] = ['ausgeruecktAm', 'vorOrtAm', 'wiederFreiAm'];

/**
 * Child-Entity des Alarmierung-Aggregats: ein einzelner Empfänger der
 * Alarmierung mit seinen Zeitpunkten und seinem Name-Snapshot.
 *
 * `nameSnapshot` wird zum Zeitpunkt der Zuordnung eingefroren, damit
 * Historie auch nach Umbenennungen lesbar bleibt.
 */
export class AlarmierungEmpfaenger {
  constructor(
    public readonly id: AlarmierungEmpfaengerId,
    public readonly alarmierungId: AlarmierungId,
    public readonly ref: AlarmierungEmpfaengerRef,
    public readonly nameSnapshot: string,
    public readonly alarmiertAm: Date,
    public ausgeruecktAm: Date | null,
    public vorOrtAm: Date | null,
    public wiederFreiAm: Date | null,
    public letzterFmsStatus: number | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public readonly createdBy: string,
    public updatedBy: string | undefined,
  ) {}

  /**
   * Reaktionszeit in Sekunden (alarmiertAm → vorOrtAm), oder null wenn
   * `vorOrtAm` noch nicht gesetzt ist.
   */
  public get reaktionszeitSekunden(): number | null {
    if (!this.vorOrtAm) return null;
    const diff = this.vorOrtAm.getTime() - this.alarmiertAm.getTime();
    return diff < 0 ? null : Math.floor(diff / 1000);
  }

  /**
   * Setzt einen Zeitpunkt direkt (intern vom Aggregat aufgerufen).
   */
  public setZeitpunkt(feld: ZeitpunktFeld, wert: Date | null): void {
    switch (feld) {
      case 'ausgeruecktAm':
        this.ausgeruecktAm = wert;
        break;
      case 'vorOrtAm':
        this.vorOrtAm = wert;
        break;
      case 'wiederFreiAm':
        this.wiederFreiAm = wert;
        break;
    }
  }

  public getZeitpunkt(feld: ZeitpunktFeld): Date | null {
    switch (feld) {
      case 'ausgeruecktAm':
        return this.ausgeruecktAm;
      case 'vorOrtAm':
        return this.vorOrtAm;
      case 'wiederFreiAm':
        return this.wiederFreiAm;
    }
  }

  public touch(updatedBy?: string): void {
    this.updatedAt = new Date();
    if (updatedBy !== undefined) {
      this.updatedBy = updatedBy;
    }
  }
}
