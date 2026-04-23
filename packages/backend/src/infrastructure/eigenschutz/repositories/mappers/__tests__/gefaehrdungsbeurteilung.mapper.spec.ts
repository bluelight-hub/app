import type { Gefaehrdungsbeurteilung as PrismaGefaehrdungsbeurteilung } from '@/generated/prisma/client';
import { PrismaGefaehrdungsbeurteilungMapper } from '../gefaehrdungsbeurteilung.mapper';

/**
 * Unit-Tests für den Rehydrations-Pfad (Story 2.3, AC1).
 *
 * Der Mapper ist der einzige Code, der `Gefaehrdungsbeurteilung.reconstitute`
 * aufruft — und `reconstitute` ist der Fix für den Story-2.2-Review-Blocker
 * „Mapper hartcodiert `version = 1`". Diese Spec sichert den Regressions-
 * Guard: wenn das `version`-Feld je wieder versehentlich fixiert würde,
 * müssen alle Tests hier brechen.
 */
describe('PrismaGefaehrdungsbeurteilungMapper (Story 2.3 AC1)', () => {
  const baseRow = (overrides: Partial<PrismaGefaehrdungsbeurteilung> = {}): PrismaGefaehrdungsbeurteilung =>
    ({
      id: 'ckv1example0aggregateid123456',
      einsatzId: 'ckv1einsatzid0000000000000001',
      einheitId: 'ckv1einheitid0000000000000001',
      erstelltVonUserId: 'ckv1userid0000000000000000001',
      vorlageId: null,
      gefahrenzoneId: null,
      items: [] as unknown,
      version: 1,
      erstelltAm: new Date('2026-04-23T10:00:00.000Z'),
      aktualisiertAm: new Date('2026-04-23T10:00:00.000Z'),
      aktualisiertVonUserId: 'ckv1userid0000000000000000001',
      ...overrides,
    }) as PrismaGefaehrdungsbeurteilung;

  it('übernimmt row.version === 5 exakt ins Aggregate (Regression-Guard: kein hardcoded "1")', () => {
    const row = baseRow({ version: 5 });
    const aggregate = PrismaGefaehrdungsbeurteilungMapper.toDomain(row);
    expect(aggregate.version).toBe(5);
  });

  it.each([2, 7, 42, 100])('übernimmt row.version === %d parametrisiert', (version) => {
    const row = baseRow({ version });
    const aggregate = PrismaGefaehrdungsbeurteilungMapper.toDomain(row);
    expect(aggregate.version).toBe(version);
  });

  it('emittiert KEINE Domain-Events beim Rehydrieren (reconstitute-Contract)', () => {
    const row = baseRow({ version: 3 });
    const aggregate = PrismaGefaehrdungsbeurteilungMapper.toDomain(row);
    expect(aggregate.getDomainEvents()).toEqual([]);
  });

  it('übernimmt alle Identitäts-Felder (einsatzId, einheitId, createdBy, vorlageId, gefahrenzoneId)', () => {
    const row = baseRow({
      einsatzId: 'ckv1einsatzid0000000000000042',
      einheitId: 'ckv1einheitid0000000000000042',
      erstelltVonUserId: 'ckv1userid0000000000000000042',
      vorlageId: 'ckv1vorlageid000000000000000001',
      gefahrenzoneId: 'ckv1gefahrzone00000000000000001',
    });
    const aggregate = PrismaGefaehrdungsbeurteilungMapper.toDomain(row);
    expect(aggregate.einsatzId).toBe('ckv1einsatzid0000000000000042');
    expect(aggregate.einheitId).toBe('ckv1einheitid0000000000000042');
    expect(aggregate.createdBy).toBe('ckv1userid0000000000000000042');
    expect(aggregate.vorlageId).toBe('ckv1vorlageid000000000000000001');
    expect(aggregate.gefahrenzoneId).toBe('ckv1gefahrzone00000000000000001');
  });

  it('überspringt malformed Items in der JSONB-Liste (Read muss fail-soft bleiben)', () => {
    const row = baseRow({
      items: [
        { id: 'itemok1', title: 'Gültiges Item' },
        null,
        'invalid-string',
        { notATitle: 'fehlt' }, // fehlendes `title` → VO.create schlägt fehl
        { id: 'itemok2', title: 'Zweites gültiges Item' },
      ] as unknown,
    });
    const aggregate = PrismaGefaehrdungsbeurteilungMapper.toDomain(row);
    expect(aggregate.items).toHaveLength(2);
    expect(aggregate.items[0].id).toBe('itemok1');
    expect(aggregate.items[1].id).toBe('itemok2');
  });

  it('wirft bei korrupter DB-Row ohne einsatzId (reconstitute-Invariante)', () => {
    const row = baseRow({ einsatzId: '' });
    expect(() => PrismaGefaehrdungsbeurteilungMapper.toDomain(row)).toThrow(/einsatzId/);
  });

  it('wirft bei korrupter DB-Row mit version < 1 (reconstitute-Invariante)', () => {
    const row = baseRow({ version: 0 });
    expect(() => PrismaGefaehrdungsbeurteilungMapper.toDomain(row)).toThrow(/version/);
  });
});
