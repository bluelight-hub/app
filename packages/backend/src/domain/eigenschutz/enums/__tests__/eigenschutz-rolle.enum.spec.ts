import { ALL_EIGENSCHUTZ_ROLLEN, EIGENSCHUTZ_ROLE_PREFIX, type EigenschutzRolle } from '../eigenschutz-rolle.enum';

describe('EigenschutzRolle (domain enum)', () => {
  it('(a) EIGENSCHUTZ_ROLE_PREFIX ist stabiler Single-Source-Wert "Eigenschutz: "', () => {
    expect(EIGENSCHUTZ_ROLE_PREFIX).toBe('Eigenschutz: ');
    // Regression-Schutz: Präfix-Länge darf sich nicht silently verschieben
    expect(EIGENSCHUTZ_ROLE_PREFIX.length).toBe(13);
  });

  it('(b) ALL_EIGENSCHUTZ_ROLLEN enthält exakt die vier erwarteten Short-Form-Werte (Union-Vollständigkeit)', () => {
    const expected: EigenschutzRolle[] = ['Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung'];
    expect(ALL_EIGENSCHUTZ_ROLLEN).toEqual(expected);
    expect(ALL_EIGENSCHUTZ_ROLLEN).toHaveLength(4);
  });
});
