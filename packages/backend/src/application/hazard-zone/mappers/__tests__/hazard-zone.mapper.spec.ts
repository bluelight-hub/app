// @ts-nocheck
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import { computeMaxWarnstufe } from '../hazard-zone.mapper';

describe('computeMaxWarnstufe', () => {
  it('gibt KEINE zurück wenn keine Bewertungen existieren', () => {
    const result = computeMaxWarnstufe([], Gefahrentyp.BRAND);
    expect(result).toBe(Warnstufe.KEINE);
  });

  it('gibt KEINE zurück wenn keine Bewertung zum Gefahrentyp existiert', () => {
    const bewertungen = [{ gefahrentyp: Gefahrentyp.CHEMISCHE_STOFFE, warnstufe: Warnstufe.HOCH }];
    const result = computeMaxWarnstufe(bewertungen, Gefahrentyp.BRAND);
    expect(result).toBe(Warnstufe.KEINE);
  });

  it('ignoriert KEINE-Bewertungen und gibt NIEDRIG zurück', () => {
    const bewertungen = [
      { gefahrentyp: Gefahrentyp.BRAND, warnstufe: Warnstufe.KEINE },
      { gefahrentyp: Gefahrentyp.BRAND, warnstufe: Warnstufe.NIEDRIG },
    ];
    const result = computeMaxWarnstufe(bewertungen, Gefahrentyp.BRAND);
    expect(result).toBe(Warnstufe.NIEDRIG);
  });

  it('gibt höchste Warnstufe über alle Schutzobjekte eines Gefahrentyps zurück', () => {
    const bewertungen = [
      { gefahrentyp: Gefahrentyp.BRAND, warnstufe: Warnstufe.NIEDRIG },
      { gefahrentyp: Gefahrentyp.BRAND, warnstufe: Warnstufe.AKUT },
      { gefahrentyp: Gefahrentyp.BRAND, warnstufe: Warnstufe.MITTEL },
      { gefahrentyp: Gefahrentyp.CHEMISCHE_STOFFE, warnstufe: Warnstufe.HOCH },
    ];
    const result = computeMaxWarnstufe(bewertungen, Gefahrentyp.BRAND);
    expect(result).toBe(Warnstufe.AKUT);
  });

  it('filtert nach Gefahrentyp und berechnet korrekt', () => {
    const bewertungen = [
      { gefahrentyp: Gefahrentyp.BRAND, warnstufe: Warnstufe.HOCH },
      { gefahrentyp: Gefahrentyp.CHEMISCHE_STOFFE, warnstufe: Warnstufe.AKUT },
    ];
    const result = computeMaxWarnstufe(bewertungen, Gefahrentyp.BRAND);
    expect(result).toBe(Warnstufe.HOCH);
  });
});
