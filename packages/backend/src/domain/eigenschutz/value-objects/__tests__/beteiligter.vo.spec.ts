import { Beteiligter } from '../beteiligter.vo';

describe('Beteiligter VO (Story 5.1)', () => {
  const VALID_USER_ID = 'clw3h8x9y0000qwertyui05001';

  it('(1) create() akzeptiert User-Beteiligten mit valider CUID2', () => {
    const result = Beteiligter.create({ kind: 'user', userId: VALID_USER_ID });
    expect(result.isSuccess).toBe(true);
    const vo = result.value!;
    expect(vo.kind).toBe('user');
    expect(vo.toJSON()).toEqual({ kind: 'user', userId: VALID_USER_ID });
  });

  it('(2) create() lehnt User mit ungültiger CUID2 ab (zu kurz)', () => {
    const result = Beteiligter.create({ kind: 'user', userId: 'a' });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/CUID2/);
  });

  it('(3) create() lehnt User mit ungültiger CUID2 ab (Großbuchstaben)', () => {
    const result = Beteiligter.create({ kind: 'user', userId: 'CLW3H8X9Y0000QWERTYUI05001' });
    expect(result.isFailure).toBe(true);
  });

  it('(4) create() trimmt Freitext-Name und akzeptiert', () => {
    const result = Beteiligter.create({ kind: 'freitext', name: '  Max Mustermann  ' });
    expect(result.isSuccess).toBe(true);
    expect(result.value!.toJSON()).toEqual({ kind: 'freitext', name: 'Max Mustermann' });
  });

  it('(5) create() lehnt leeren Freitext-Namen ab', () => {
    const result = Beteiligter.create({ kind: 'freitext', name: '   ' });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/name/);
  });

  it('(6) create() lehnt Freitext-Name > 200 Zeichen ab', () => {
    const result = Beteiligter.create({ kind: 'freitext', name: 'a'.repeat(201) });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/200/);
  });

  it('(7) create() akzeptiert optionale Rolle (User)', () => {
    const result = Beteiligter.create({ kind: 'user', userId: VALID_USER_ID, rolle: 'Sanitäter' });
    expect(result.isSuccess).toBe(true);
    expect(result.value!.toJSON()).toEqual({ kind: 'user', userId: VALID_USER_ID, rolle: 'Sanitäter' });
  });

  it('(8) create() lehnt zu lange Rolle ab', () => {
    const result = Beteiligter.create({ kind: 'freitext', name: 'X', rolle: 'a'.repeat(101) });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/rolle/);
  });

  it('(9) create() trimmt leere Rolle weg (undefined statt leer)', () => {
    const result = Beteiligter.create({ kind: 'user', userId: VALID_USER_ID, rolle: '   ' });
    expect(result.isSuccess).toBe(true);
    expect(result.value!.toJSON()).toEqual({ kind: 'user', userId: VALID_USER_ID });
  });

  it('(10) equals() unterscheidet kind und userId', () => {
    const a = Beteiligter.create({ kind: 'user', userId: VALID_USER_ID }).value!;
    const b = Beteiligter.create({ kind: 'user', userId: VALID_USER_ID }).value!;
    const c = Beteiligter.create({ kind: 'freitext', name: 'Max' }).value!;
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
