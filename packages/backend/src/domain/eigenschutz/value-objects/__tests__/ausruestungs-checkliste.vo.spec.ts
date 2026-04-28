import { PsaProfil } from '@/generated/prisma/enums';
import { AUSRUESTUNGS_CHECKLISTEN, buildAggregierteCheckliste, getAusruestungsCheckliste } from '../ausruestungs-checkliste.vo';

describe('AusruestungsCheckliste (Story 3.5 — Value Object)', () => {
  it('liefert für jedes PsaProfil eine Checkliste mit ≥ 3 Items', () => {
    for (const profil of Object.values(PsaProfil)) {
      const checkliste = AUSRUESTUNGS_CHECKLISTEN[profil];
      expect(checkliste).toBeDefined();
      expect(checkliste.profil).toBe(profil);
      expect(checkliste.items.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('hat global eindeutige Item-IDs über alle Profile', () => {
    const allIds = Object.values(AUSRUESTUNGS_CHECKLISTEN).flatMap((c) => c.items.map((i) => i.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('liefert via getAusruestungsCheckliste die exakte Profil-Checkliste', () => {
    const checkliste = getAusruestungsCheckliste(PsaProfil.CBRN_PATIENT);
    expect(checkliste.profil).toBe(PsaProfil.CBRN_PATIENT);
    expect(checkliste.items.some((i) => i.id === 'cbrn-ffp3-maske')).toBe(true);
  });

  it('wirft bei unbekanntem Profil', () => {
    expect(() => getAusruestungsCheckliste('UNBEKANNT' as PsaProfil)).toThrow(/Unbekanntes PSA-Profil/);
  });

  it('dedupliziert in buildAggregierteCheckliste über mehrere Profile', () => {
    // Forward-Compat: aktuell überschneiden sich die IDs nicht — wir
    // simulieren eine Überschneidung, indem wir das gleiche Profil zweimal
    // anhängen. Das beweist die De-Duplikations-Logik.
    const aggregiert = buildAggregierteCheckliste([PsaProfil.BASIS, PsaProfil.BASIS]);
    const basisItems = AUSRUESTUNGS_CHECKLISTEN[PsaProfil.BASIS].items;
    expect(aggregiert.length).toBe(basisItems.length);
    expect(aggregiert.map((i) => i.id)).toEqual(basisItems.map((i) => i.id));
  });

  it('aggregiert mehrere disjunkte Profile in Eingabe-Reihenfolge', () => {
    const aggregiert = buildAggregierteCheckliste([PsaProfil.BASIS, PsaProfil.INFEKTION]);
    const erwartet = [...AUSRUESTUNGS_CHECKLISTEN[PsaProfil.BASIS].items.map((i) => i.id), ...AUSRUESTUNGS_CHECKLISTEN[PsaProfil.INFEKTION].items.map((i) => i.id)];
    expect(aggregiert.map((i) => i.id)).toEqual(erwartet);
  });
});
