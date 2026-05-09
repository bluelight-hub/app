import { describe, expect, it } from 'vitest';
import { PSA_PROFIL_META, PSA_PROFIL_REIHENFOLGE } from '../psa-profil.constants';

describe('PSA_PROFIL_META', () => {
  const tokenFamilies = {
    BASIS: 'psa-profile-basis',
    INFEKTION: 'psa-profile-infektion',
    VU: 'psa-profile-vu',
    CBRN_PATIENT: 'psa-profile-cbrn-patient',
    VOLLSCHUTZ: 'psa-profile-vollschutz',
  } as const;

  it('nutzt Story-7.1-PSA-Tokens für normale und aktive Chip-Zustände', () => {
    for (const profil of PSA_PROFIL_REIHENFOLGE) {
      const tokenFamily = tokenFamilies[profil];
      const meta = PSA_PROFIL_META[profil];

      expect(meta.chipColorClass).toContain(`border-${tokenFamily}-border`);
      expect(meta.chipColorClass).toContain(`bg-${tokenFamily}-surface`);
      expect(meta.chipColorClass).toContain(`text-${tokenFamily}-text`);
      expect(meta.chipColorActiveClass).toContain(`border-${tokenFamily}-active-border`);
      expect(meta.chipColorActiveClass).toContain(`bg-${tokenFamily}-active-surface`);
      expect(meta.chipColorActiveClass).toContain(`text-${tokenFamily}-active-text`);
    }
  });

  it('vermeidet feature-lokale Tailwind-Palettenfarben für PSA-Chips', () => {
    for (const profil of PSA_PROFIL_REIHENFOLGE) {
      const meta = PSA_PROFIL_META[profil];

      expect(`${meta.chipColorClass} ${meta.chipColorActiveClass}`).not.toMatch(/\b(?:border|bg|text)-(?:slate|amber|orange|red|rose)-/);
    }
  });
});
