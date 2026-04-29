/**
 * Tests für den DRY-Helper `assertCallerAuthorizedForEinheit` (Story 3.6 AC4).
 *
 * Wird sowohl vom `AckPsaQuittungHandler` (Story 3.4) als auch vom
 * `MeldeLueckeHandler` (Story 3.6) konsumiert. Identische Sentinels +
 * identisches Verhalten — der Helper ist die einzige Quelle der Wahrheit.
 */
import { assertCallerAuthorizedForEinheit, UNZULAESSIGE_EINHEITEN_ZUORDNUNG } from '../caller-authorization';

const EINSATZ_ID = 'einsatz-cuid2-1234567890123';
const CALLER_USER_ID = 'user-cuid2-1234567890123456';
const EINHEIT_ID = 'einheit-cuid2-1234567890123456';
const TEILNEHMER_PERSON_ID = 'person-cuid2-12345678901234';

const tx = {} as never;

function makeDeps(overrides: { teilnehmer?: unknown; existsZuordnung?: boolean } = {}) {
  const teilnehmer = overrides.teilnehmer === undefined ? { einsatzId: EINSATZ_ID, einsatzPersonId: TEILNEHMER_PERSON_ID, leftAt: null } : overrides.teilnehmer;
  return {
    teilnehmerRepo: {
      findByEinsatzAndUser: jest.fn().mockResolvedValue(teilnehmer),
    },
    einheitRepo: {
      existsPersonenZuordnung: jest.fn().mockResolvedValue(overrides.existsZuordnung ?? true),
    },
  } as never;
}

describe('assertCallerAuthorizedForEinheit()', () => {
  it('Happy-Path: aktiver Teilnehmer + Mitgliedschaft → ok', async () => {
    const deps = makeDeps();

    const result = await assertCallerAuthorizedForEinheit(tx, deps, { einsatzId: EINSATZ_ID, callerUserId: CALLER_USER_ID, einheitId: EINHEIT_ID });

    expect(result.isSuccess).toBe(true);
  });

  it('lehnt ab, wenn kein Teilnehmer im Einsatz vorhanden ist', async () => {
    const deps = makeDeps({ teilnehmer: null });

    const result = await assertCallerAuthorizedForEinheit(tx, deps, { einsatzId: EINSATZ_ID, callerUserId: CALLER_USER_ID, einheitId: EINHEIT_ID });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(UNZULAESSIGE_EINHEITEN_ZUORDNUNG);
  });

  it('lehnt ab, wenn teilnehmer.einsatzId nicht zum Command-einsatzId matcht', async () => {
    const deps = makeDeps({ teilnehmer: { einsatzId: 'anderer-einsatz', einsatzPersonId: TEILNEHMER_PERSON_ID, leftAt: null } });

    const result = await assertCallerAuthorizedForEinheit(tx, deps, { einsatzId: EINSATZ_ID, callerUserId: CALLER_USER_ID, einheitId: EINHEIT_ID });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(UNZULAESSIGE_EINHEITEN_ZUORDNUNG);
  });

  it('lehnt ab, wenn teilnehmer.leftAt gesetzt ist (ausgeschieden)', async () => {
    const deps = makeDeps({ teilnehmer: { einsatzId: EINSATZ_ID, einsatzPersonId: TEILNEHMER_PERSON_ID, leftAt: new Date() } });

    const result = await assertCallerAuthorizedForEinheit(tx, deps, { einsatzId: EINSATZ_ID, callerUserId: CALLER_USER_ID, einheitId: EINHEIT_ID });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(UNZULAESSIGE_EINHEITEN_ZUORDNUNG);
  });

  it('lehnt ab, wenn keine Personen-Zuordnung zur Einheit existiert', async () => {
    const deps = makeDeps({ existsZuordnung: false });

    const result = await assertCallerAuthorizedForEinheit(tx, deps, { einsatzId: EINSATZ_ID, callerUserId: CALLER_USER_ID, einheitId: EINHEIT_ID });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(UNZULAESSIGE_EINHEITEN_ZUORDNUNG);
  });
});
