/**
 * Unit-Tests für PrismaSicherheitsregelMapper (Story 2.6 Task 4).
 */

import type { Sicherheitsregel as PrismaSicherheitsregelRow } from '@/generated/prisma/client';
import { Sicherheitsregel } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';
import { PrismaSicherheitsregelMapper } from '../sicherheitsregel.mapper';

const baseRow = (overrides: Partial<PrismaSicherheitsregelRow> = {}): PrismaSicherheitsregelRow =>
  ({
    id: 'clw3h8x9y0000qwertyuiregel1',
    einsatzId: 'clw3h8x9y0000qwertyui00002',
    einheitId: 'clw3h8x9y0000qwertyui00050',
    titel: 'Alkoholverbot',
    inhalt: 'Kein Alkohol während des Einsatzes.',
    version: 1,
    erstelltAm: new Date('2026-04-24T10:00:00.000Z'),
    erstelltVonUserId: 'clw3h8x9y0000qwertyui00099',
    aktualisiertAm: new Date('2026-04-24T10:00:00.000Z'),
    aktualisiertVonUserId: 'clw3h8x9y0000qwertyui00099',
    ...overrides,
  }) as PrismaSicherheitsregelRow;

describe('PrismaSicherheitsregelMapper.toDomain()', () => {
  it('rekonstruiert Aggregate aus Row inkl. Version', () => {
    const row = baseRow();

    const result = PrismaSicherheitsregelMapper.toDomain(row);

    expect(result.isSuccess).toBe(true);
    const aggregate = result.value!;
    expect(aggregate.id.value).toBe(row.id);
    expect(aggregate.einsatzId).toBe(row.einsatzId);
    expect(aggregate.einheitId).toBe(row.einheitId);
    expect(aggregate.titel).toBe(row.titel);
    expect(aggregate.inhalt).toBe(row.inhalt);
    expect(aggregate.version).toBe(1);
    expect(aggregate.einsatzweit).toBe(false);
  });

  it('unterstützt einheitId=null (einsatzweit)', () => {
    const row = baseRow({ einheitId: null });

    const result = PrismaSicherheitsregelMapper.toDomain(row);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.einheitId).toBeNull();
    expect(result.value!.einsatzweit).toBe(true);
  });

  it('liefert Result.fail bei korrupter Version (0)', () => {
    const row = baseRow({ version: 0 });

    const result = PrismaSicherheitsregelMapper.toDomain(row);

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/version/);
  });

  it('liefert Result.fail bei fehlender einsatzId', () => {
    const row = baseRow({ einsatzId: '' });

    const result = PrismaSicherheitsregelMapper.toDomain(row);

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/einsatzId/);
  });

  it('übernimmt höhere Versionen 1:1 (keine Factory-Reset)', () => {
    const row = baseRow({ version: 7 });

    const result = PrismaSicherheitsregelMapper.toDomain(row);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.version).toBe(7);
    // Reconstitute darf KEINE Domain-Events erzeugen.
    expect(result.value!.getDomainEvents()).toHaveLength(0);
  });
});

describe('PrismaSicherheitsregelMapper.toPersistenceCreate()', () => {
  it('baut Create-Shape mit allen Feldern und aktualisiertVonUserId-Parameter', () => {
    const createResult = Sicherheitsregel.create({
      einsatzId: 'einsatz-1',
      einheitId: 'einheit-1',
      titel: 'Alkoholverbot',
      inhalt: 'Kein Alkohol während des Einsatzes.',
      erstelltVonUserId: 'user-1',
      propagationGroupId: 'propgroup-1',
    });
    const aggregate = createResult.value!;

    const shape = PrismaSicherheitsregelMapper.toPersistenceCreate(aggregate, 'user-2');

    expect(shape).toEqual({
      id: aggregate.id.value,
      einsatzId: 'einsatz-1',
      einheitId: 'einheit-1',
      titel: 'Alkoholverbot',
      inhalt: 'Kein Alkohol während des Einsatzes.',
      version: 1,
      erstelltVonUserId: 'user-1',
      aktualisiertVonUserId: 'user-2',
    });
  });

  it('behält einheitId=null bei einsatzweiter Regel', () => {
    const createResult = Sicherheitsregel.create({
      einsatzId: 'einsatz-1',
      einheitId: null,
      titel: 'Sperre',
      inhalt: 'Keine Zufahrt',
      erstelltVonUserId: 'user-1',
      propagationGroupId: 'propgroup-1',
    });
    const aggregate = createResult.value!;

    const shape = PrismaSicherheitsregelMapper.toPersistenceCreate(aggregate, 'user-1');

    expect(shape.einheitId).toBeNull();
  });
});

describe('PrismaSicherheitsregelMapper.toPersistenceUpdate()', () => {
  it('baut Update-Shape mit neuen Werten und inkrementierter Version', () => {
    const createResult = Sicherheitsregel.create({
      einsatzId: 'einsatz-1',
      einheitId: 'einheit-1',
      titel: 'Alt',
      inhalt: 'Alt-Inhalt',
      erstelltVonUserId: 'user-1',
      propagationGroupId: 'propgroup-1',
    });
    const aggregate = createResult.value!;
    aggregate.update({ titel: 'Neu', inhalt: 'Neu-Inhalt', einheitId: 'einheit-2' }, 1, 'user-2', 'propgroup-upd');

    const shape = PrismaSicherheitsregelMapper.toPersistenceUpdate(aggregate, 'user-2');

    expect(shape).toEqual({
      titel: 'Neu',
      inhalt: 'Neu-Inhalt',
      einheitId: 'einheit-2',
      version: 2,
      aktualisiertVonUserId: 'user-2',
    });
  });
});
