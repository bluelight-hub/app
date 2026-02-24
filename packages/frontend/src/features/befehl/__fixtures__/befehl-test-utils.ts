import type { BefehlDto, BefehlEmpfaengerDto } from '@bluelight-hub/shared/client';

/** Test-Empfaenger erstellen (quittierbar, mit User-Link) */
export function createEmpfaenger(overrides: Partial<BefehlEmpfaengerDto> & { empfaengerId: string }): BefehlEmpfaengerDto {
  return {
    id: `emp-${overrides.empfaengerId}`,
    name: overrides.name ?? overrides.empfaengerId,
    empfaengerId: overrides.empfaengerId,
    istQuittierbar: true,
    zugestelltAm: overrides.zugestelltAm,
    quittiertAm: overrides.quittiertAm,
    quittierungArt: overrides.quittierungArt,
  };
}

/** Test-Befehl erstellen mit sinnvollen Defaults */
export function createBefehl(overrides: Partial<BefehlDto> & { id: string; nummer: string }): BefehlDto {
  return {
    einsatzId: 'einsatz-1',
    auftrag: 'Testauftrag',
    befehlsgeberName: 'Einsatzleiter',
    erstellerId: 'user-1',
    status: 'ERTEILT',
    befehlstyp: 'KURZBEFEHL',
    erteiltAm: new Date('2026-01-01T10:00:00Z'),
    empfaenger: [createEmpfaenger({ empfaengerId: 'emp-1' })],
    kommentare: [],
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  };
}

/** Test-Empfaenger erstellen OHNE User-Link (nicht quittierbar, z.B. "Polizei") */
export function createNichtQuittierbarEmpfaenger(overrides: Partial<BefehlEmpfaengerDto> & { name: string }): BefehlEmpfaengerDto {
  return {
    id: overrides.id ?? `emp-${overrides.name.toLowerCase().replace(/\s/g, '-')}`,
    name: overrides.name,
    empfaengerId: undefined,
    istQuittierbar: false,
    zugestelltAm: overrides.zugestelltAm,
    quittiertAm: overrides.quittiertAm,
    quittierungArt: overrides.quittierungArt,
  };
}
