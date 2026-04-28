import { ALL_EIGENSCHUTZ_PERMISSIONS, type EigenschutzPermission } from '../eigenschutz-permission.enum';

describe('EigenschutzPermission (domain enum)', () => {
  it('(a) ALL_EIGENSCHUTZ_PERMISSIONS enthält 14 Einträge (Architecture §B10 Z. 699–706 + Story 3.4 psa:acknowledge)', () => {
    expect(ALL_EIGENSCHUTZ_PERMISSIONS).toHaveLength(14);
  });

  it('(b) ALL_EIGENSCHUTZ_PERMISSIONS matcht exakt die erwartete Literal-Union (Vollständigkeit)', () => {
    const expected: EigenschutzPermission[] = [
      'eigenschutz:gefaehrdungsbeurteilung:read',
      'eigenschutz:gefaehrdungsbeurteilung:write',
      'eigenschutz:psa:read',
      'eigenschutz:psa:write',
      'eigenschutz:psa:acknowledge',
      'eigenschutz:sicherheitsregel:read',
      'eigenschutz:sicherheitsregel:write',
      'eigenschutz:sicherheitsregel:acknowledge',
      'eigenschutz:sicherungsposten:read',
      'eigenschutz:sicherungsposten:write',
      'eigenschutz:vorfall:read',
      'eigenschutz:vorfall:report',
      'eigenschutz:vorfall:export',
      'eigenschutz:telemetry:write',
    ];
    expect(ALL_EIGENSCHUTZ_PERMISSIONS).toEqual(expected);
  });

  it('(c) Story 3.4: psa:acknowledge ist als Permission registriert', () => {
    expect(ALL_EIGENSCHUTZ_PERMISSIONS).toContain('eigenschutz:psa:acknowledge');
  });
});
