import { UpdateGefaehrdungsbeurteilungItemsCommand } from '../update-gefaehrdungsbeurteilung-items.command';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const BEURTEILUNG_ID = 'clw3h8x9y0000qwertyui00077';
const USER_ID = 'clw3h8x9y0000qwertyui00099';

describe('UpdateGefaehrdungsbeurteilungItemsCommand', () => {
  it('create() liefert Command bei validen Argumenten', () => {
    const result = UpdateGefaehrdungsbeurteilungItemsCommand.create({
      einsatzId: EINSATZ_ID,
      gefaehrdungsbeurteilungId: BEURTEILUNG_ID,
      userId: USER_ID,
      expectedVersion: 1,
      items: [{ title: 'Neue-Gefährdung' }],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value?.einsatzId).toBe(EINSATZ_ID);
    expect(result.value?.expectedVersion).toBe(1);
    expect(result.value?.items).toHaveLength(1);
  });

  it.each([
    { field: 'einsatzId', invalid: { einsatzId: '' } },
    { field: 'einsatzId', invalid: { einsatzId: '   ' } },
    { field: 'gefaehrdungsbeurteilungId', invalid: { gefaehrdungsbeurteilungId: '' } },
    { field: 'userId', invalid: { userId: '' } },
  ])('create() lehnt leeres $field ab', ({ field, invalid }) => {
    const result = UpdateGefaehrdungsbeurteilungItemsCommand.create({
      einsatzId: EINSATZ_ID,
      gefaehrdungsbeurteilungId: BEURTEILUNG_ID,
      userId: USER_ID,
      expectedVersion: 1,
      items: [],
      ...invalid,
    });
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(field);
  });

  it('create() lehnt nicht-positive expectedVersion ab', () => {
    const zero = UpdateGefaehrdungsbeurteilungItemsCommand.create({
      einsatzId: EINSATZ_ID,
      gefaehrdungsbeurteilungId: BEURTEILUNG_ID,
      userId: USER_ID,
      expectedVersion: 0,
      items: [],
    });
    const negative = UpdateGefaehrdungsbeurteilungItemsCommand.create({
      einsatzId: EINSATZ_ID,
      gefaehrdungsbeurteilungId: BEURTEILUNG_ID,
      userId: USER_ID,
      expectedVersion: -1,
      items: [],
    });
    const float = UpdateGefaehrdungsbeurteilungItemsCommand.create({
      einsatzId: EINSATZ_ID,
      gefaehrdungsbeurteilungId: BEURTEILUNG_ID,
      userId: USER_ID,
      expectedVersion: 1.5,
      items: [],
    });

    expect(zero.isFailure).toBe(true);
    expect(negative.isFailure).toBe(true);
    expect(float.isFailure).toBe(true);
  });

  it('create() lehnt nicht-Array items ab', () => {
    const result = UpdateGefaehrdungsbeurteilungItemsCommand.create({
      einsatzId: EINSATZ_ID,
      gefaehrdungsbeurteilungId: BEURTEILUNG_ID,
      userId: USER_ID,
      expectedVersion: 1,
      items: 'nicht-array' as unknown as never[],
    });
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('items');
  });

  it('create() akzeptiert leeres items-Array (Alles-Entfernen erlaubt)', () => {
    const result = UpdateGefaehrdungsbeurteilungItemsCommand.create({
      einsatzId: EINSATZ_ID,
      gefaehrdungsbeurteilungId: BEURTEILUNG_ID,
      userId: USER_ID,
      expectedVersion: 2,
      items: [],
    });
    expect(result.isSuccess).toBe(true);
    expect(result.value?.items).toEqual([]);
  });
});
