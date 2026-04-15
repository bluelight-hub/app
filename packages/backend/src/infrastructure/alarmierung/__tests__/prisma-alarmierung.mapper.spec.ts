// @ts-nocheck
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { Alarmierung as PrismaAlarmierung, AlarmierungEmpfaenger as PrismaAlarmierungEmpfaenger } from '@/generated/prisma/client';
import { PrismaAlarmierungMapper, type AlarmierungWithEmpfaenger } from '../prisma-alarmierung.mapper';

function makeEinsatzId(): EinsatzId {
  const r = EinsatzId.create();
  if (r.isFailure) throw new Error(r.error as string);
  return r.value as EinsatzId;
}

function createAggregate(): AlarmierungAggregate {
  const r = AlarmierungAggregate.create({
    einsatzId: makeEinsatzId(),
    bezeichnung: 'Wohnungsbrand',
    beschreibung: 'Test-Alarmierung mit Umlauten: ä, ö, ü, ß',
    alarmierungszeit: new Date('2026-04-15T10:00:00Z'),
    createdBy: 'user-1',
  });
  if (r.isFailure) throw new Error(r.error as string);
  return r.value as AlarmierungAggregate;
}

describe('PrismaAlarmierungMapper', () => {
  describe('toPersistence', () => {
    it('serialisiert Root-Stammdaten inkl. Umlaute und Audit-Felder', () => {
      const agg = createAggregate();
      const { alarmierung, empfaenger } = PrismaAlarmierungMapper.toPersistence(agg);

      expect(alarmierung.id).toBe(agg.alarmierung.id.value);
      expect(alarmierung.einsatzId).toBe(agg.einsatzId.value);
      expect(alarmierung.bezeichnung).toBe('Wohnungsbrand');
      expect(alarmierung.beschreibung).toBe('Test-Alarmierung mit Umlauten: ä, ö, ü, ß');
      expect(alarmierung.status).toBe('aktiv');
      expect(alarmierung.ursprungAlarmierungId).toBeNull();
      expect(alarmierung.createdBy).toBe('user-1');
      expect(empfaenger).toHaveLength(0);
    });

    it('mappt ursprungAlarmierungId auf FK bei Nachalarmierung', () => {
      const einsatzId = makeEinsatzId();
      const primary = AlarmierungAggregate.create({ einsatzId, bezeichnung: 'Erst-Alarm', createdBy: 'u' }).value as AlarmierungAggregate;
      const nachalarm = AlarmierungAggregate.create({
        einsatzId,
        bezeichnung: 'Nach-Alarm',
        ursprungAlarmierungId: primary.alarmierung.id,
        createdBy: 'u',
      }).value as AlarmierungAggregate;

      const { alarmierung } = PrismaAlarmierungMapper.toPersistence(nachalarm);
      expect(alarmierung.ursprungAlarmierungId).toBe(primary.alarmierung.id.value);
    });

    it('mappt Empfänger mit fahrzeugId wenn ref.kind = fahrzeug', () => {
      const agg = createAggregate();
      agg.fuegeEmpfaengerHinzu({ ref: { kind: 'fahrzeug', fahrzeugId: 'fzg-1' }, nameSnapshot: 'Florian 1', createdBy: 'u' });
      const { empfaenger } = PrismaAlarmierungMapper.toPersistence(agg);
      expect(empfaenger).toHaveLength(1);
      expect(empfaenger[0].fahrzeugId).toBe('fzg-1');
      expect(empfaenger[0].personId).toBeNull();
      expect(empfaenger[0].einheitId).toBeNull();
      expect(empfaenger[0].nameSnapshot).toBe('Florian 1');
    });

    it('mappt Empfänger mit personId wenn ref.kind = person', () => {
      const agg = createAggregate();
      agg.fuegeEmpfaengerHinzu({ ref: { kind: 'person', personId: 'p-1' }, nameSnapshot: 'Müller, Hans', createdBy: 'u' });
      const { empfaenger } = PrismaAlarmierungMapper.toPersistence(agg);
      expect(empfaenger[0].fahrzeugId).toBeNull();
      expect(empfaenger[0].personId).toBe('p-1');
      expect(empfaenger[0].einheitId).toBeNull();
      expect(empfaenger[0].nameSnapshot).toBe('Müller, Hans');
    });

    it('mappt Empfänger mit einheitId wenn ref.kind = einheit', () => {
      const agg = createAggregate();
      agg.fuegeEmpfaengerHinzu({ ref: { kind: 'einheit', einheitId: 'e-1' }, nameSnapshot: 'Gruppe Süd', createdBy: 'u' });
      const { empfaenger } = PrismaAlarmierungMapper.toPersistence(agg);
      expect(empfaenger[0].fahrzeugId).toBeNull();
      expect(empfaenger[0].personId).toBeNull();
      expect(empfaenger[0].einheitId).toBe('e-1');
    });
  });

  describe('toAggregate + Roundtrip', () => {
    function toPrismaRow(data: ReturnType<typeof PrismaAlarmierungMapper.toPersistence>): AlarmierungWithEmpfaenger {
      return {
        ...(data.alarmierung as unknown as PrismaAlarmierung),
        empfaenger: data.empfaenger as unknown as PrismaAlarmierungEmpfaenger[],
      } as AlarmierungWithEmpfaenger;
    }

    it('rekonstruiert Root + alle drei Empfänger-Varianten roundtrip', () => {
      const agg = createAggregate();
      agg.fuegeEmpfaengerHinzu({ ref: { kind: 'fahrzeug', fahrzeugId: 'fzg-1' }, nameSnapshot: 'Florian 1', createdBy: 'u' });
      agg.fuegeEmpfaengerHinzu({ ref: { kind: 'person', personId: 'p-1' }, nameSnapshot: 'Leiter', createdBy: 'u' });
      agg.fuegeEmpfaengerHinzu({ ref: { kind: 'einheit', einheitId: 'e-1' }, nameSnapshot: 'Gruppe', createdBy: 'u' });

      const row = toPrismaRow(PrismaAlarmierungMapper.toPersistence(agg));
      const rebuilt = PrismaAlarmierungMapper.toAggregate(row);

      expect(rebuilt.alarmierung.id.value).toBe(agg.alarmierung.id.value);
      expect(rebuilt.einsatzId.value).toBe(agg.einsatzId.value);
      expect(rebuilt.bezeichnung).toBe(agg.bezeichnung);
      expect(rebuilt.beschreibung).toBe(agg.beschreibung);
      expect(rebuilt.empfaenger).toHaveLength(3);
      expect(rebuilt.empfaenger.map((e) => e.ref)).toEqual([
        { kind: 'fahrzeug', fahrzeugId: 'fzg-1' },
        { kind: 'person', personId: 'p-1' },
        { kind: 'einheit', einheitId: 'e-1' },
      ]);
    });

    it('rekonstruiert Zeitpunkte (alarmiertAm, ausgeruecktAm, vorOrtAm, wiederFreiAm) und letzterFmsStatus', () => {
      const agg = createAggregate();
      agg.fuegeEmpfaengerHinzu({ ref: { kind: 'fahrzeug', fahrzeugId: 'fzg-1' }, nameSnapshot: 'F1', createdBy: 'u' });
      const empfaengerId = agg.empfaenger[0]!.id;
      const baseZeitpunkt = new Date('2026-04-15T10:05:00Z');
      agg.aktualisiereZeitpunktAusFms('fzg-1', 3, baseZeitpunkt);
      agg.korrigiereZeitpunkt(empfaengerId, 'vorOrtAm', new Date('2026-04-15T10:20:00Z'), 'u');

      const row = toPrismaRow(PrismaAlarmierungMapper.toPersistence(agg));
      const rebuilt = PrismaAlarmierungMapper.toAggregate(row);

      expect(rebuilt.empfaenger[0].ausgeruecktAm?.toISOString()).toBe('2026-04-15T10:05:00.000Z');
      expect(rebuilt.empfaenger[0].vorOrtAm?.toISOString()).toBe('2026-04-15T10:20:00.000Z');
      expect(rebuilt.empfaenger[0].wiederFreiAm).toBeNull();
      expect(rebuilt.empfaenger[0].letzterFmsStatus).toBe(3);
    });

    it('wirft bei unbekanntem Status in DB', () => {
      const agg = createAggregate();
      const row = toPrismaRow(PrismaAlarmierungMapper.toPersistence(agg));
      (row as unknown as { status: string }).status = 'INVALID';
      expect(() => PrismaAlarmierungMapper.toAggregate(row)).toThrow(/Ungültiger AlarmierungStatus/);
    });

    it('wirft wenn Empfänger null/mehrere Referenz-FKs hat', () => {
      const agg = createAggregate();
      agg.fuegeEmpfaengerHinzu({ ref: { kind: 'fahrzeug', fahrzeugId: 'fzg-1' }, nameSnapshot: 'F1', createdBy: 'u' });
      const data = PrismaAlarmierungMapper.toPersistence(agg);
      (data.empfaenger[0] as unknown as { personId: string | null }).personId = 'p-1';
      const row = toPrismaRow(data);
      expect(() => PrismaAlarmierungMapper.toAggregate(row)).toThrow(/exakt eine Empfänger-Referenz/);
    });
  });
});
