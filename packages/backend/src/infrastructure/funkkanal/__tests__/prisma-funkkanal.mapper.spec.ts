import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { KanalDetails, type KanalDetailsShape } from '@domain/aggregates/funkkanal/kanal-details.vo';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { Funkkanal as PrismaFunkkanal, FunkkanalZuordnung as PrismaFunkkanalZuordnung } from '@/generated/prisma/client';
import { PrismaFunkkanalMapper, type FunkkanalWithZuordnungen } from '../prisma-funkkanal.mapper';

function makeEinsatzId(): EinsatzId {
  const r = EinsatzId.create();
  if (r.isFailure) throw new Error(r.error as string);
  return r.value as EinsatzId;
}

function tmoDetails(): KanalDetailsShape {
  const r = KanalDetails.tmo({ sprechgruppe: 'SG_FEUER_1', gssi: '1234' });
  if (r.isFailure) throw new Error(r.error as string);
  return r.value as KanalDetailsShape;
}

function dmoDetails(): KanalDetailsShape {
  const r = KanalDetails.dmo({ dmoKanal: '310', repeater: 'R1' });
  if (r.isFailure) throw new Error(r.error as string);
  return r.value as KanalDetailsShape;
}

function analogDetails(): KanalDetailsShape {
  const r = KanalDetails.analog({ band: '4m', frequenz: '85.5125', kanalnummer: '468GU' });
  if (r.isFailure) throw new Error(r.error as string);
  return r.value as KanalDetailsShape;
}

function createTmoAggregate() {
  const einsatzId = makeEinsatzId();
  const r = FunkkanalAggregate.create({ einsatzId, name: 'Feuer 1', details: tmoDetails(), sortIndex: 2, zweck: 'Florian', createdBy: 'user-1' });
  if (r.isFailure) throw new Error(r.error as string);
  return { einsatzId, aggregate: r.value as FunkkanalAggregate };
}

describe('PrismaFunkkanalMapper', () => {
  describe('toPersistence', () => {
    it('serialisiert TMO-Kanal mit gssi in detailsData ohne Discriminator', () => {
      const { aggregate } = createTmoAggregate();
      const { kanal, zuordnungen } = PrismaFunkkanalMapper.toPersistence(aggregate);

      expect(kanal.id).toBe(aggregate.kanal.id.value);
      expect(kanal.einsatzId).toBe(aggregate.einsatzId.value);
      expect(kanal.name).toBe('Feuer 1');
      expect(kanal.detailsType).toBe('tmo');
      expect(kanal.detailsData).toEqual({ sprechgruppe: 'SG_FEUER_1', gssi: '1234' });
      expect(kanal.status).toBe('aktiv');
      expect(kanal.zweck).toBe('Florian');
      expect(kanal.sortIndex).toBe(2);
      expect(kanal.createdBy).toBe('user-1');
      expect(zuordnungen).toHaveLength(0);
    });

    it('serialisiert DMO-Details ohne Discriminator', () => {
      const einsatzId = makeEinsatzId();
      const r = FunkkanalAggregate.create({ einsatzId, name: 'DMO', details: dmoDetails(), sortIndex: 0 });
      const aggregate = r.value as FunkkanalAggregate;
      const { kanal } = PrismaFunkkanalMapper.toPersistence(aggregate);
      expect(kanal.detailsType).toBe('dmo');
      expect(kanal.detailsData).toEqual({ dmoKanal: '310', repeater: 'R1' });
    });

    it('serialisiert Analog-Details ohne Discriminator', () => {
      const einsatzId = makeEinsatzId();
      const r = FunkkanalAggregate.create({ einsatzId, name: '4m Analog', details: analogDetails(), sortIndex: 0 });
      const aggregate = r.value as FunkkanalAggregate;
      const { kanal } = PrismaFunkkanalMapper.toPersistence(aggregate);
      expect(kanal.detailsType).toBe('analog');
      expect(kanal.detailsData).toEqual({ band: '4m', frequenz: '85.5125', kanalnummer: '468GU' });
    });

    it('mappt Zuordnungen mit fahrzeugId wenn kraftRef.kind = fahrzeug', () => {
      const { aggregate } = createTmoAggregate();
      aggregate.zuordneKraft({ kraftRef: { kind: 'fahrzeug', fahrzeugId: 'fzg-1' }, rufnameSnapshot: 'Florian 1', rolle: 'primaer' });
      const { zuordnungen } = PrismaFunkkanalMapper.toPersistence(aggregate);
      expect(zuordnungen).toHaveLength(1);
      expect(zuordnungen[0].fahrzeugId).toBe('fzg-1');
      expect(zuordnungen[0].personId).toBeNull();
      expect(zuordnungen[0].einheitId).toBeNull();
      expect(zuordnungen[0].rufnameSnapshot).toBe('Florian 1');
      expect(zuordnungen[0].rolle).toBe('primaer');
    });

    it('mappt Zuordnungen mit personId wenn kraftRef.kind = person', () => {
      const { aggregate } = createTmoAggregate();
      aggregate.zuordneKraft({ kraftRef: { kind: 'person', personId: 'p-1' }, rufnameSnapshot: 'Leiter 1', rolle: 'sekundaer' });
      const { zuordnungen } = PrismaFunkkanalMapper.toPersistence(aggregate);
      expect(zuordnungen[0].fahrzeugId).toBeNull();
      expect(zuordnungen[0].personId).toBe('p-1');
      expect(zuordnungen[0].einheitId).toBeNull();
    });

    it('mappt Zuordnungen mit einheitId wenn kraftRef.kind = einheit', () => {
      const { aggregate } = createTmoAggregate();
      aggregate.zuordneKraft({ kraftRef: { kind: 'einheit', einheitId: 'e-1' }, rufnameSnapshot: 'Einheit 1', rolle: 'zuhoeren' });
      const { zuordnungen } = PrismaFunkkanalMapper.toPersistence(aggregate);
      expect(zuordnungen[0].fahrzeugId).toBeNull();
      expect(zuordnungen[0].personId).toBeNull();
      expect(zuordnungen[0].einheitId).toBe('e-1');
    });
  });

  describe('toAggregate + Roundtrip', () => {
    function toPrismaRow(data: ReturnType<typeof PrismaFunkkanalMapper.toPersistence>): FunkkanalWithZuordnungen {
      return {
        ...(data.kanal as unknown as PrismaFunkkanal),
        zuordnungen: data.zuordnungen as unknown as PrismaFunkkanalZuordnung[],
      } as FunkkanalWithZuordnungen;
    }

    it('rekonstruiert TMO-Kanal mit Zuordnungen (Fahrzeug + Person + Einheit)', () => {
      const { aggregate } = createTmoAggregate();
      aggregate.zuordneKraft({ kraftRef: { kind: 'fahrzeug', fahrzeugId: 'fzg-1' }, rufnameSnapshot: 'Florian 1', rolle: 'primaer' });
      aggregate.zuordneKraft({ kraftRef: { kind: 'person', personId: 'p-1' }, rufnameSnapshot: 'Leiter', rolle: 'sekundaer' });
      aggregate.zuordneKraft({ kraftRef: { kind: 'einheit', einheitId: 'e-1' }, rufnameSnapshot: 'Gruppe A', rolle: 'zuhoeren' });

      const row = toPrismaRow(PrismaFunkkanalMapper.toPersistence(aggregate));
      const rebuilt = PrismaFunkkanalMapper.toAggregate(row);

      expect(rebuilt.kanal.id.value).toBe(aggregate.kanal.id.value);
      expect(rebuilt.kanal.einsatzId.value).toBe(aggregate.einsatzId.value);
      expect(rebuilt.kanal.name).toBe(aggregate.kanal.name);
      expect(rebuilt.kanal.details).toEqual(aggregate.kanal.details);
      expect(rebuilt.kanal.zweck).toBe(aggregate.kanal.zweck);
      expect(rebuilt.zuordnungen).toHaveLength(3);
      expect(rebuilt.zuordnungen.map((z) => z.kraftRef)).toEqual([
        { kind: 'fahrzeug', fahrzeugId: 'fzg-1' },
        { kind: 'person', personId: 'p-1' },
        { kind: 'einheit', einheitId: 'e-1' },
      ]);
      expect(rebuilt.zuordnungen.map((z) => z.rolle)).toEqual(['primaer', 'sekundaer', 'zuhoeren']);
    });

    it('rekonstruiert DMO-Kanal roundtrip', () => {
      const einsatzId = makeEinsatzId();
      const r = FunkkanalAggregate.create({ einsatzId, name: 'DMO', details: dmoDetails(), sortIndex: 0 });
      const aggregate = r.value as FunkkanalAggregate;
      const row = toPrismaRow(PrismaFunkkanalMapper.toPersistence(aggregate));
      const rebuilt = PrismaFunkkanalMapper.toAggregate(row);
      expect(rebuilt.kanal.details).toEqual({ type: 'dmo', dmoKanal: '310', repeater: 'R1' });
    });

    it('rekonstruiert Analog-Kanal roundtrip', () => {
      const einsatzId = makeEinsatzId();
      const r = FunkkanalAggregate.create({ einsatzId, name: 'Analog', details: analogDetails(), sortIndex: 5 });
      const aggregate = r.value as FunkkanalAggregate;
      const row = toPrismaRow(PrismaFunkkanalMapper.toPersistence(aggregate));
      const rebuilt = PrismaFunkkanalMapper.toAggregate(row);
      expect(rebuilt.kanal.details).toEqual({ type: 'analog', band: '4m', frequenz: '85.5125', kanalnummer: '468GU' });
      expect(rebuilt.kanal.sortIndex).toBe(5);
    });

    it('wirft bei unbekanntem Status in DB', () => {
      const { aggregate } = createTmoAggregate();
      const data = PrismaFunkkanalMapper.toPersistence(aggregate);
      const row = toPrismaRow(data);
      (row as unknown as { status: string }).status = 'INVALID';
      expect(() => PrismaFunkkanalMapper.toAggregate(row)).toThrow(/Ungültiger FunkkanalStatus/);
    });

    it('wirft wenn Zuordnung null/mehrere Kraft-Referenzen hat', () => {
      const { aggregate } = createTmoAggregate();
      aggregate.zuordneKraft({ kraftRef: { kind: 'fahrzeug', fahrzeugId: 'fzg-1' }, rufnameSnapshot: 'F1', rolle: 'primaer' });
      const data = PrismaFunkkanalMapper.toPersistence(aggregate);
      (data.zuordnungen[0] as unknown as { personId: string | null }).personId = 'p-1';
      const row = toPrismaRow(data);
      expect(() => PrismaFunkkanalMapper.toAggregate(row)).toThrow(/exakt eine Kraft-Referenz/);
    });
  });
});
