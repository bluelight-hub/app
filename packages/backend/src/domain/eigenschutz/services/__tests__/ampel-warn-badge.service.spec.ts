import { AmpelWarnBadgeService, type GefaehrdungWarnCandidate, type PsaWarnCandidate } from '../ampel-warn-badge.service';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui06501';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui06502';
const NOW = new Date('2026-05-08T10:15:00.000Z');

const gefaehrdung = (overrides: Partial<GefaehrdungWarnCandidate> = {}): GefaehrdungWarnCandidate => ({
  einsatzId: EINSATZ_ID,
  einheitId: EINHEIT_ID,
  gefaehrdungsbeurteilungId: 'gef-1',
  gefaehrdungItemId: 'item-1',
  gefaehrdungTitel: 'Austretender Kraftstoff',
  risikoklasse: 'ROT',
  schutzmassnahmen: undefined,
  aktualisiertAm: new Date('2026-05-08T10:10:00.000Z'),
  ...overrides,
});

const psa = (overrides: Partial<PsaWarnCandidate> = {}): PsaWarnCandidate => ({
  einsatzId: EINSATZ_ID,
  einheitId: EINHEIT_ID,
  propagationGroupId: 'group-1',
  occurredAt: new Date('2026-05-08T10:00:00.000Z'),
  ueberfaelligSeitMin: 15,
  ...overrides,
});

describe('AmpelWarnBadgeService', () => {
  const service = new AmpelWarnBadgeService();

  it('erzeugt ein deterministisches Gefährdungs-Badge für rote Items ohne Schutzmaßnahme', () => {
    const [badge] = service.buildBadges({ gefaehrdungen: [gefaehrdung()], psa: [], now: NOW });

    expect(badge).toMatchObject({
      id: 'gefahr:gef-1:item-1',
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      type: 'GEFAEHRDUNG_OHNE_SCHUTZMASSNAHME',
      label: 'Gefährdung ohne Schutzmaßnahme',
      sortRank: 10,
      gefaehrdungsbeurteilungId: 'gef-1',
      gefaehrdungItemId: 'item-1',
      gefaehrdungTitel: 'Austretender Kraftstoff',
    });
  });

  it('behandelt fehlende und leer getrimmte Schutzmaßnahmen identisch', () => {
    expect(service.isGefaehrdungOhneSchutzmassnahme(gefaehrdung({ schutzmassnahmen: undefined }))).toBe(true);
    expect(service.isGefaehrdungOhneSchutzmassnahme(gefaehrdung({ schutzmassnahmen: '   ' }))).toBe(true);
  });

  it('filtert nicht-rote oder geschützte Gefährdungen heraus', () => {
    const badges = service.buildBadges({
      gefaehrdungen: [gefaehrdung({ risikoklasse: 'GELB' }), gefaehrdung({ gefaehrdungItemId: 'item-2', schutzmassnahmen: 'Absperren' })],
      psa: [],
      now: NOW,
    });

    expect(badges).toEqual([]);
  });

  it('erzeugt PSA-Badges nur ab fünf Minuten Überfälligkeit', () => {
    const badges = service.buildBadges({ gefaehrdungen: [], psa: [psa({ ueberfaelligSeitMin: 4 }), psa()], now: NOW });

    expect(badges).toHaveLength(1);
    expect(badges[0]).toMatchObject({
      id: 'psa:group-1:clw3h8x9y0000qwertyui06502',
      type: 'PSA_QUITTUNG_UEBERFAELLIG',
      label: 'Quittung überfällig',
      sortRank: 20,
      propagationGroupId: 'group-1',
      ueberfaelligSeitMin: 15,
      occurredAt: '2026-05-08T10:00:00.000Z',
    });
  });

  it('berechnet negative oder nicht-finite PSA-Minuten defensiv aus occurredAt', () => {
    const [badge] = service.buildBadges({ gefaehrdungen: [], psa: [psa({ ueberfaelligSeitMin: Number.NaN })], now: NOW });

    expect(badge.ueberfaelligSeitMin).toBe(15);
  });

  it('sortiert stabil nach sortRank, Aktualität und ID', () => {
    const badges = service.buildBadges({
      gefaehrdungen: [
        gefaehrdung({ gefaehrdungsbeurteilungId: 'gef-b', gefaehrdungItemId: 'item-b', aktualisiertAm: new Date('2026-05-08T10:05:00.000Z') }),
        gefaehrdung({ gefaehrdungsbeurteilungId: 'gef-a', gefaehrdungItemId: 'item-a', aktualisiertAm: new Date('2026-05-08T10:12:00.000Z') }),
      ],
      psa: [psa({ propagationGroupId: 'group-a' })],
      now: NOW,
    });

    expect(badges.map((badge) => badge.id)).toEqual(['gefahr:gef-a:item-a', 'gefahr:gef-b:item-b', 'psa:group-a:clw3h8x9y0000qwertyui06502']);
  });

  it('cappt maximal 20 Badges pro Einheit und 100 pro Einsatz', () => {
    const gefaehrdungen = Array.from({ length: 25 }, (_, index) =>
      gefaehrdung({
        gefaehrdungsbeurteilungId: `gef-${index}`,
        gefaehrdungItemId: `item-${index}`,
        aktualisiertAm: new Date(`2026-05-08T10:${String(index).padStart(2, '0')}:00.000Z`),
      }),
    );

    const badges = service.buildBadges({ gefaehrdungen, psa: [], now: NOW });

    expect(badges).toHaveLength(20);
  });

  it('erhält beim Per-Einheit-Cap mindestens eine vorhandene Warnung pro Typ', () => {
    const gefaehrdungen = Array.from({ length: 25 }, (_, index) =>
      gefaehrdung({
        gefaehrdungsbeurteilungId: `gef-${index}`,
        gefaehrdungItemId: `item-${index}`,
        aktualisiertAm: new Date(`2026-05-08T10:${String(index).padStart(2, '0')}:00.000Z`),
      }),
    );

    const badges = service.buildBadges({ gefaehrdungen, psa: [psa()], now: NOW });

    expect(badges).toHaveLength(20);
    expect(badges.some((badge) => badge.type === 'PSA_QUITTUNG_UEBERFAELLIG')).toBe(true);
  });

  it('erzeugt auch ohne Item-ID ein nicht-totes Gefährdungsziel', () => {
    const [badge] = service.buildBadges({ gefaehrdungen: [gefaehrdung({ gefaehrdungItemId: null })], psa: [], now: NOW });

    expect(badge.id).toBe('gefahr:gef-1:unknown');
    expect(badge.gefaehrdungItemId).toBeNull();
  });

  it('nutzt Fallback-Keys für mehrere Gefährdungen ohne Item-ID eindeutig', () => {
    const badges = service.buildBadges({
      gefaehrdungen: [gefaehrdung({ gefaehrdungItemId: null, gefaehrdungItemFallbackKey: 'item-index-0' }), gefaehrdung({ gefaehrdungItemId: null, gefaehrdungItemFallbackKey: 'item-index-1' })],
      psa: [],
      now: NOW,
    });

    expect(badges.map((badge) => badge.id)).toEqual(['gefahr:gef-1:item-index-0', 'gefahr:gef-1:item-index-1']);
    expect(badges.every((badge) => badge.gefaehrdungItemId === null)).toBe(true);
  });
});
