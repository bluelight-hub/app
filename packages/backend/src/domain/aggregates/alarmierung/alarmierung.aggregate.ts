import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { AlarmierungAbgeschlossenEvent } from '@domain/events/alarmierung-abgeschlossen.event';
import { AlarmierungEmpfaengerEntferntEvent } from '@domain/events/alarmierung-empfaenger-entfernt.event';
import { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import { AlarmierungErstelltEvent } from '@domain/events/alarmierung-erstellt.event';
import { AlarmierungZeitpunktFmsGesetztEvent } from '@domain/events/alarmierung-zeitpunkt-fms-gesetzt.event';
import { AlarmierungZeitpunktKorrigiertEvent } from '@domain/events/alarmierung-zeitpunkt-korrigiert.event';
import { NachalarmierungErstelltEvent } from '@domain/events/nachalarmierung-erstellt.event';
import type { AlarmierungEmpfaengerRef } from './alarmierung-empfaenger-ref';
import { empfaengerRefEquals, validateEmpfaengerRef } from './alarmierung-empfaenger-ref';
import { AlarmierungEmpfaenger } from './alarmierung-empfaenger.entity';
import type { ZeitpunktFeld } from './alarmierung-empfaenger.entity';
import { Alarmierung } from './alarmierung.entity';
import type { AlarmierungStatus } from './alarmierung.entity';

export interface CreateAlarmierungArgs {
  readonly einsatzId: EinsatzId;
  readonly bezeichnung: string;
  readonly beschreibung?: string;
  readonly alarmierungszeit?: Date;
  readonly ursprungAlarmierungId?: AlarmierungId;
  readonly createdBy: string;
  /**
   * Anzahl der Empfänger, die der Command-Handler im Anschluss atomar hinzufügt.
   * Fließt in die Payload des `AlarmierungErstelltEvent` und damit in den
   * ETB-Eintrag ein. Default `0` — relevant nur, wenn das Aggregat ohne
   * Empfänger angelegt wird (z. B. in Tests).
   */
  readonly initialEmpfaengerCount?: number;
}

export interface FuegeEmpfaengerHinzuArgs {
  readonly ref: AlarmierungEmpfaengerRef;
  readonly nameSnapshot: string;
  readonly alarmiertAm?: Date;
  readonly createdBy: string;
}

/**
 * FMS-Status → Zeitpunktfeld-Mapping für Auto-Population.
 *
 * - Status 3 "Einsatzauftrag übernommen / ausgerückt" → `ausgeruecktAm`
 * - Status 4 "Am Einsatzort"                        → `vorOrtAm`
 * - Status 1/2 "Einsatzbereit"                     → `wiederFreiAm`
 *
 * Nur das erste Auftreten eines Status setzt den Zeitpunkt — spätere
 * Statuswechsel überschreiben bereits gesetzte Werte NICHT.
 */
const FMS_STATUS_TO_ZEITPUNKT: Readonly<Record<number, ZeitpunktFeld | undefined>> = {
  1: 'wiederFreiAm',
  2: 'wiederFreiAm',
  3: 'ausgeruecktAm',
  4: 'vorOrtAm',
};

export function mapFmsStatusZuZeitpunktFeld(fmsStatus: number): ZeitpunktFeld | undefined {
  return FMS_STATUS_TO_ZEITPUNKT[fmsStatus];
}

/**
 * DDD Aggregate Root für eine Alarmierung (Issue #408).
 *
 * Das Aggregat verwaltet die Lifecycle-Daten einer Alarmierung sowie deren
 * Empfänger (Fahrzeuge, Personen, Einheiten) inklusive nachtragbarer
 * Zeitpunkte (`alarmiertAm`, `ausgeruecktAm`, `vorOrtAm`, `wiederFreiAm`).
 *
 * Zwei getrennte Änderungspfade für Zeitpunkte:
 * - `korrigiereZeitpunkt()` — manuelles Nachtragen (eigenes Event, Audit-Trail)
 * - `aktualisiereZeitpunktAusFms()` — Auto-Population aus FMS-Statuswechseln
 */
export class AlarmierungAggregate extends AggregateRoot<AlarmierungId> {
  private readonly _alarmierung: Alarmierung;
  private _empfaenger: AlarmierungEmpfaenger[];

  protected constructor(alarmierung: Alarmierung, empfaenger: AlarmierungEmpfaenger[], createdAt?: Date, updatedAt?: Date) {
    super(alarmierung.id, createdAt, updatedAt);
    this._alarmierung = alarmierung;
    this._empfaenger = empfaenger;
  }

  get alarmierung(): Alarmierung {
    return this._alarmierung;
  }

  get einsatzId(): EinsatzId {
    return this._alarmierung.einsatzId;
  }

  get bezeichnung(): string {
    return this._alarmierung.bezeichnung;
  }

  get beschreibung(): string | undefined {
    return this._alarmierung.beschreibung;
  }

  get status(): AlarmierungStatus {
    return this._alarmierung.status;
  }

  get alarmierungszeit(): Date {
    return this._alarmierung.alarmierungszeit;
  }

  get ursprungAlarmierungId(): AlarmierungId | undefined {
    return this._alarmierung.ursprungAlarmierungId;
  }

  get istNachalarmierung(): boolean {
    return !!this._alarmierung.ursprungAlarmierungId;
  }

  get empfaenger(): ReadonlyArray<AlarmierungEmpfaenger> {
    return this._empfaenger;
  }

  /**
   * Factory für neue Alarmierungen. Emittiert `AlarmierungErstelltEvent` und
   * — falls Nachalarmierung — zusätzlich `NachalarmierungErstelltEvent`.
   *
   * Empfänger werden NICHT in der Factory gesetzt, sondern via
   * `fuegeEmpfaengerHinzu()` nachgereicht. Das erlaubt dem Command-Handler,
   * alle Empfänger validiert + transaktional zu ergänzen.
   */
  public static create(args: CreateAlarmierungArgs): Result<AlarmierungAggregate> {
    const bezeichnung = args.bezeichnung?.trim();
    if (!bezeichnung) {
      return Result.fail<AlarmierungAggregate>('Bezeichnung ist erforderlich');
    }
    if (!args.einsatzId) {
      return Result.fail<AlarmierungAggregate>('EinsatzId ist erforderlich');
    }
    if (!args.createdBy?.trim()) {
      return Result.fail<AlarmierungAggregate>('createdBy ist erforderlich');
    }

    const idResult = AlarmierungId.create();
    if (idResult.isFailure) {
      return Result.fail<AlarmierungAggregate>(idResult.error as string);
    }
    const id = idResult.value as AlarmierungId;

    const now = new Date();
    const alarmierungszeit = args.alarmierungszeit ?? now;
    const beschreibung = args.beschreibung?.trim() || undefined;

    const alarmierung = new Alarmierung(id, args.einsatzId, bezeichnung, beschreibung, alarmierungszeit, 'aktiv', args.ursprungAlarmierungId, now, now, args.createdBy, args.createdBy);

    const aggregate = new AlarmierungAggregate(alarmierung, [], now, now);
    aggregate.addDomainEvent(
      new AlarmierungErstelltEvent(id, args.einsatzId, {
        bezeichnung,
        beschreibung,
        alarmierungszeit,
        ursprungAlarmierungId: args.ursprungAlarmierungId?.value,
        empfaengerCount: args.initialEmpfaengerCount ?? 0,
      }),
    );
    if (args.ursprungAlarmierungId) {
      aggregate.addDomainEvent(
        new NachalarmierungErstelltEvent(id, args.einsatzId, {
          bezeichnung,
          ursprungAlarmierungId: args.ursprungAlarmierungId,
        }),
      );
    }
    return Result.ok<AlarmierungAggregate>(aggregate);
  }

  /**
   * Rekonstruiert ein Aggregat aus persistierten Daten (Repository-intern).
   * Emittiert KEINE Events.
   */
  public static reconstitute(alarmierung: Alarmierung, empfaenger: AlarmierungEmpfaenger[]): AlarmierungAggregate {
    return new AlarmierungAggregate(alarmierung, empfaenger, alarmierung.createdAt, alarmierung.updatedAt);
  }

  public isAbgeschlossen(): boolean {
    return this._alarmierung.status === 'abgeschlossen';
  }

  public fuegeEmpfaengerHinzu(args: FuegeEmpfaengerHinzuArgs): Result<AlarmierungEmpfaenger> {
    if (this.isAbgeschlossen()) {
      return Result.fail<AlarmierungEmpfaenger>('Abgeschlossene Alarmierung kann keine weiteren Empfänger aufnehmen');
    }
    const refValidation = validateEmpfaengerRef(args.ref);
    if (refValidation.isFailure) {
      return Result.fail<AlarmierungEmpfaenger>(refValidation.error as string);
    }
    const nameSnapshot = args.nameSnapshot?.trim();
    if (!nameSnapshot) {
      return Result.fail<AlarmierungEmpfaenger>('nameSnapshot ist erforderlich');
    }
    if (!args.createdBy?.trim()) {
      return Result.fail<AlarmierungEmpfaenger>('createdBy ist erforderlich');
    }
    if (this._empfaenger.some((e) => empfaengerRefEquals(e.ref, args.ref))) {
      return Result.fail<AlarmierungEmpfaenger>('Empfänger ist dieser Alarmierung bereits zugeordnet');
    }

    const idResult = AlarmierungEmpfaengerId.create();
    if (idResult.isFailure) {
      return Result.fail<AlarmierungEmpfaenger>(idResult.error as string);
    }
    const empfaengerId = idResult.value as AlarmierungEmpfaengerId;

    const now = new Date();
    const alarmiertAm = args.alarmiertAm ?? this._alarmierung.alarmierungszeit;

    const empfaenger = new AlarmierungEmpfaenger(empfaengerId, this._alarmierung.id, args.ref, nameSnapshot, alarmiertAm, null, null, null, null, now, now, args.createdBy, args.createdBy);
    this._empfaenger.push(empfaenger);
    this.touch(args.createdBy);
    this.addDomainEvent(
      new AlarmierungEmpfaengerHinzugefuegtEvent(this._alarmierung.id, this.einsatzId, {
        empfaengerId,
        ref: args.ref,
        nameSnapshot,
        alarmiertAm,
      }),
    );
    return Result.ok<AlarmierungEmpfaenger>(empfaenger);
  }

  public entferneEmpfaenger(empfaengerId: AlarmierungEmpfaengerId, updatedBy: string): Result<void> {
    if (this.isAbgeschlossen()) {
      return Result.fail<void>('Abgeschlossene Alarmierung kann nicht geändert werden');
    }
    const index = this._empfaenger.findIndex((e) => e.id.equals(empfaengerId));
    if (index === -1) {
      return Result.fail<void>('Empfänger nicht gefunden');
    }
    const entferntNameSnapshot = this._empfaenger[index]!.nameSnapshot;
    this._empfaenger.splice(index, 1);
    this.touch(updatedBy);
    this.addDomainEvent(
      new AlarmierungEmpfaengerEntferntEvent(this._alarmierung.id, this.einsatzId, {
        empfaengerId,
        nameSnapshot: entferntNameSnapshot,
      }),
    );
    return Result.ok<void>(undefined);
  }

  /**
   * Manuelles Nachtragen oder Korrigieren eines Zeitpunkts.
   * Emittiert `AlarmierungZeitpunktKorrigiertEvent` mit altem+neuem Wert (Audit).
   *
   * `wert === null` löscht einen vorher gesetzten Zeitpunkt.
   */
  public korrigiereZeitpunkt(empfaengerId: AlarmierungEmpfaengerId, feld: ZeitpunktFeld, wert: Date | null, updatedBy: string): Result<void> {
    if (this.isAbgeschlossen()) {
      return Result.fail<void>('Abgeschlossene Alarmierung kann nicht geändert werden');
    }
    if (!updatedBy?.trim()) {
      return Result.fail<void>('updatedBy ist erforderlich');
    }
    const empfaenger = this._empfaenger.find((e) => e.id.equals(empfaengerId));
    if (!empfaenger) {
      return Result.fail<void>('Empfänger nicht gefunden');
    }
    const alterWert = empfaenger.getZeitpunkt(feld);
    if (datesEqual(alterWert, wert)) {
      return Result.ok<void>(undefined);
    }
    if (wert && wert.getTime() < empfaenger.alarmiertAm.getTime()) {
      return Result.fail<void>(`${feld} darf nicht vor alarmiertAm liegen`);
    }
    empfaenger.setZeitpunkt(feld, wert);
    empfaenger.touch(updatedBy);
    this.touch(updatedBy);
    this.addDomainEvent(
      new AlarmierungZeitpunktKorrigiertEvent(this._alarmierung.id, this.einsatzId, {
        empfaengerId,
        nameSnapshot: empfaenger.nameSnapshot,
        feld,
        alterWert,
        neuerWert: wert,
        korrigiertVon: updatedBy,
      }),
    );
    return Result.ok<void>(undefined);
  }

  /**
   * Auto-Population aus FMS-Statuswechseln (wird vom Event-Handler aufgerufen).
   *
   * Setzt das zum Status passende Zeitpunktfeld NUR wenn es noch nicht
   * gesetzt ist. Überschreibt keine manuellen Nachträge.
   *
   * Nur für Empfänger vom Typ `fahrzeug` wirksam — ein anderer Empfänger
   * wird als no-op behandelt (Result.ok).
   */
  public aktualisiereZeitpunktAusFms(fahrzeugId: string, fmsStatus: number, zeitpunkt: Date): Result<void> {
    if (this.isAbgeschlossen()) {
      return Result.ok<void>(undefined);
    }
    const empfaenger = this._empfaenger.find((e) => e.ref.kind === 'fahrzeug' && e.ref.fahrzeugId === fahrzeugId);
    if (!empfaenger) {
      return Result.ok<void>(undefined);
    }
    empfaenger.letzterFmsStatus = fmsStatus;
    const feld = mapFmsStatusZuZeitpunktFeld(fmsStatus);
    if (!feld) {
      empfaenger.touch();
      this.touch();
      return Result.ok<void>(undefined);
    }
    if (empfaenger.getZeitpunkt(feld) !== null) {
      empfaenger.touch();
      this.touch();
      return Result.ok<void>(undefined);
    }
    if (zeitpunkt.getTime() < empfaenger.alarmiertAm.getTime()) {
      empfaenger.touch();
      this.touch();
      return Result.ok<void>(undefined);
    }
    empfaenger.setZeitpunkt(feld, zeitpunkt);
    empfaenger.touch();
    this.touch();
    this.addDomainEvent(
      new AlarmierungZeitpunktFmsGesetztEvent(this._alarmierung.id, this.einsatzId, {
        empfaengerId: empfaenger.id,
        nameSnapshot: empfaenger.nameSnapshot,
        feld,
        wert: zeitpunkt,
        fmsStatus,
      }),
    );
    return Result.ok<void>(undefined);
  }

  public abschliessen(updatedBy: string): Result<void> {
    if (this.isAbgeschlossen()) {
      return Result.fail<void>('Alarmierung ist bereits abgeschlossen');
    }
    if (!updatedBy?.trim()) {
      return Result.fail<void>('updatedBy ist erforderlich');
    }
    this._alarmierung.status = 'abgeschlossen';
    this.touch(updatedBy);
    this.addDomainEvent(new AlarmierungAbgeschlossenEvent(this._alarmierung.id, this.einsatzId, updatedBy));
    return Result.ok<void>(undefined);
  }

  private touch(updatedBy?: string): void {
    this._alarmierung.updatedAt = new Date();
    if (updatedBy !== undefined) {
      this._alarmierung.updatedBy = updatedBy;
    }
    this.updateTimestamp();
  }
}

function datesEqual(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.getTime() === b.getTime();
}
