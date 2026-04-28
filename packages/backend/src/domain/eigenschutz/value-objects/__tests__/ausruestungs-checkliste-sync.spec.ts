import { AUSRUESTUNGS_CHECKLISTEN as BE } from '../ausruestungs-checkliste.vo';
// Frontend-Mirror — Pure-TS-Modul ohne React/DOM/Prisma; Backend-Jest lädt
// risikofrei via deep-relativem Import. Production-Bundle ist nicht
// betroffen (Test-Code wird nicht gebündelt). Phase 2 (FR16) löst die
// Spiegelung durch einen generierten API-Hook ab — dann verschwindet diese
// Datei zusammen mit dem Frontend-Spiegel.
import { AUSRUESTUNGS_CHECKLISTEN as FE } from '../../../../../../frontend/src/features/eigenschutz/constants/ausruestungs-checkliste.constants';

describe('AusruestungsChecklisten — Backend ↔ Frontend Sync (Story 3.5 AC4)', () => {
  it('hat identische Profil-Schlüssel-Menge', () => {
    expect(new Set(Object.keys(FE))).toEqual(new Set(Object.keys(BE)));
  });

  it('hat identische Item-IDs + Labels pro Profil', () => {
    for (const profil of Object.keys(BE) as Array<keyof typeof BE>) {
      const beItems = BE[profil].items.map((i) => ({ id: i.id, label: i.label }));
      const feItems = FE[profil].items.map((i) => ({ id: i.id, label: i.label }));
      expect(feItems).toEqual(beItems);
    }
  });
});
