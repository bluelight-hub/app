import { CreateGefaehrdungsbeurteilungCommand } from '../create-gefaehrdungsbeurteilung.command';

describe('CreateGefaehrdungsbeurteilungCommand', () => {
  const VALID = {
    einsatzId: 'clw3h8x9y0000qwertyui00002',
    einheitId: 'clw3h8x9y0000qwertyui00050',
    createdBy: 'clw3h8x9y0000qwertyui00099',
  } as const;

  it('create() akzeptiert minimale valide Eingaben (Leer-Formular)', () => {
    const result = CreateGefaehrdungsbeurteilungCommand.create(VALID);
    expect(result.isSuccess).toBe(true);
    const cmd = result.value!;
    expect(cmd.einsatzId).toBe(VALID.einsatzId);
    expect(cmd.vorlageId).toBeNull();
    expect(cmd.gefahrenzoneId).toBeNull();
  });

  it('create() trimmt IDs und akzeptiert optionale vorlageId/gefahrenzoneId', () => {
    const result = CreateGefaehrdungsbeurteilungCommand.create({
      einsatzId: `  ${VALID.einsatzId}  `,
      einheitId: VALID.einheitId,
      createdBy: VALID.createdBy,
      vorlageId: 'clw3h8x9y0000qwertyui00111',
      gefahrenzoneId: 'clw3h8x9y0000qwertyui00222',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.value?.einsatzId).toBe(VALID.einsatzId);
    expect(result.value?.vorlageId).toBe('clw3h8x9y0000qwertyui00111');
    expect(result.value?.gefahrenzoneId).toBe('clw3h8x9y0000qwertyui00222');
  });

  it('lehnt leere einsatzId ab', () => {
    const result = CreateGefaehrdungsbeurteilungCommand.create({ ...VALID, einsatzId: '' });
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('einsatzId');
  });

  it('lehnt leere einheitId ab', () => {
    const result = CreateGefaehrdungsbeurteilungCommand.create({ ...VALID, einheitId: '   ' });
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('einheitId');
  });

  it('lehnt leere createdBy ab', () => {
    const result = CreateGefaehrdungsbeurteilungCommand.create({ ...VALID, createdBy: '' });
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('createdBy');
  });

  it('lehnt leere vorlageId (nach Trim) ab, wenn gesetzt', () => {
    const result = CreateGefaehrdungsbeurteilungCommand.create({ ...VALID, vorlageId: '   ' });
    expect(result.isFailure).toBe(true);
  });
});
