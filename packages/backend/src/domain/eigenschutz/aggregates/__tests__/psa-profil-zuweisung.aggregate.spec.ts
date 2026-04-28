import { PsaProfilGeaendertEvent } from '../../events/psa-profil-geaendert.event';
import { PSA_PROFIL_CONFLICT_DETECTED, PsaProfilZuweisung } from '../psa-profil-zuweisung.aggregate';

describe('PsaProfilZuweisung Aggregate (Story 3.1)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const USER_ID = 'clw3h8x9y0000qwertyui00099';
  const PROPAGATION_GROUP_ID = 'clw3h8x9y0000qwertyui00777';
  const ZUWEISUNG_ID = 'clw3h8x9y0000qwertyuipsa001';

  function validCreateProps(overrides: Partial<Parameters<typeof PsaProfilZuweisung.create>[0]> = {}): Parameters<typeof PsaProfilZuweisung.create>[0] {
    return {
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      profil: 'BASIS',
      begruendung: 'Routine-Aktivierung BASIS-Schutz für aktive Einheit.',
      aktiviertVonUserId: USER_ID,
      propagationGroupId: PROPAGATION_GROUP_ID,
      ...overrides,
    };
  }

  describe('create()', () => {
    it('(1) Happy-Path: legt aktive Zuweisung an, version=1, gueltigBis=null, emittiert AKTIVIERT-Event', () => {
      const result = PsaProfilZuweisung.create(validCreateProps());
      expect(result.isSuccess).toBe(true);
      const aggregate = result.value!;
      expect(aggregate.profil).toBe('BASIS');
      expect(aggregate.version).toBe(1);
      expect(aggregate.gueltigBis).toBeNull();
      expect(aggregate.istAktiv).toBe(true);
      expect(aggregate.begruendung).toBe('Routine-Aktivierung BASIS-Schutz für aktive Einheit.');

      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as PsaProfilGeaendertEvent;
      expect(event).toBeInstanceOf(PsaProfilGeaendertEvent);
      expect(event.einsatzId).toBe(EINSATZ_ID);
      expect(event.einheitId).toBe(EINHEIT_ID);
      expect(event.userId).toBe(USER_ID);
      expect(event.zuweisungId).toBe(aggregate.id.value);
      expect(event.profil).toBe('BASIS');
      expect(event.aktion).toBe('AKTIVIERT');
      expect(event.propagationGroupId).toBe(PROPAGATION_GROUP_ID);
      expect(event.begruendung).toBe('Routine-Aktivierung BASIS-Schutz für aktive Einheit.');
    });

    it('(2) trimmt Begründung', () => {
      const result = PsaProfilZuweisung.create(validCreateProps({ begruendung: '   Whitespace ringsum   ' }));
      expect(result.isSuccess).toBe(true);
      expect(result.value!.begruendung).toBe('Whitespace ringsum');
      const event = result.value!.getDomainEvents()[0] as PsaProfilGeaendertEvent;
      expect(event.begruendung).toBe('Whitespace ringsum');
    });

    it('(3) lehnt leere Begründung ab', () => {
      const result = PsaProfilZuweisung.create(validCreateProps({ begruendung: '   ' }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('begruendung ist erforderlich');
    });

    it('(4) lehnt zu lange Begründung ab (>500 Zeichen)', () => {
      const result = PsaProfilZuweisung.create(validCreateProps({ begruendung: 'x'.repeat(501) }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('500');
    });

    it.each([['einsatzId'], ['einheitId'], ['aktiviertVonUserId'], ['propagationGroupId']])('(5) lehnt leere Pflicht-Felder ab: %s', (field) => {
      const result = PsaProfilZuweisung.create(validCreateProps({ [field]: '' } as Partial<Parameters<typeof PsaProfilZuweisung.create>[0]>));
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(field);
    });
  });

  describe('reconstitute()', () => {
    it('(1) rehydriert aktive Zuweisung ohne Events', () => {
      const result = PsaProfilZuweisung.reconstitute({
        id: ZUWEISUNG_ID,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        profil: 'INFEKTION',
        gueltigVon: new Date('2026-04-24T10:00:00.000Z'),
        gueltigBis: null,
        aktiviertVonUserId: USER_ID,
        begruendung: 'Bestand aus DB',
        propagationGroupId: PROPAGATION_GROUP_ID,
        version: 3,
      });
      expect(result.isSuccess).toBe(true);
      const aggregate = result.value!;
      expect(aggregate.id.value).toBe(ZUWEISUNG_ID);
      expect(aggregate.version).toBe(3);
      expect(aggregate.istAktiv).toBe(true);
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('(2) rehydriert geschlossene Zuweisung (gueltigBis gesetzt)', () => {
      const von = new Date('2026-04-24T10:00:00.000Z');
      const bis = new Date('2026-04-24T11:00:00.000Z');
      const result = PsaProfilZuweisung.reconstitute({
        id: ZUWEISUNG_ID,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        profil: 'VU',
        gueltigVon: von,
        gueltigBis: bis,
        aktiviertVonUserId: USER_ID,
        begruendung: 'Geschlossen, weil VU-Einsatz beendet.',
        propagationGroupId: PROPAGATION_GROUP_ID,
        version: 2,
      });
      expect(result.isSuccess).toBe(true);
      expect(result.value!.istAktiv).toBe(false);
      expect(result.value!.gueltigBis).toEqual(bis);
    });

    it('(3) lehnt version=0 ab', () => {
      const result = PsaProfilZuweisung.reconstitute({
        id: ZUWEISUNG_ID,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        profil: 'BASIS',
        gueltigVon: new Date(),
        gueltigBis: null,
        aktiviertVonUserId: USER_ID,
        begruendung: 'ok',
        propagationGroupId: PROPAGATION_GROUP_ID,
        version: 0,
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('version');
    });

    it('(4) lehnt gueltigBis < gueltigVon ab', () => {
      const result = PsaProfilZuweisung.reconstitute({
        id: ZUWEISUNG_ID,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        profil: 'BASIS',
        gueltigVon: new Date('2026-04-24T11:00:00.000Z'),
        gueltigBis: new Date('2026-04-24T10:00:00.000Z'),
        aktiviertVonUserId: USER_ID,
        begruendung: 'ok',
        propagationGroupId: PROPAGATION_GROUP_ID,
        version: 1,
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('gueltigBis');
    });
  });

  describe('deactivate()', () => {
    function makeActive(): PsaProfilZuweisung {
      const result = PsaProfilZuweisung.reconstitute({
        id: ZUWEISUNG_ID,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        profil: 'CBRN_PATIENT',
        gueltigVon: new Date('2026-04-24T10:00:00.000Z'),
        gueltigBis: null,
        aktiviertVonUserId: USER_ID,
        begruendung: 'Initial-Aktivierung',
        propagationGroupId: PROPAGATION_GROUP_ID,
        version: 1,
      });
      if (result.isFailure || !result.value) throw new Error(`Setup-Fixture defekt: ${result.error}`);
      return result.value;
    }

    it('(1) Happy-Path: schließt Row, inkrementiert version, emittiert DEAKTIVIERT-Event', () => {
      const aggregate = makeActive();
      const closingTs = new Date('2026-04-24T11:00:00.000Z');
      const result = aggregate.deactivate({
        expectedVersion: 1,
        userId: USER_ID,
        begruendung: 'CBRN-Lage entschärft, Profil deaktivieren.',
        propagationGroupId: 'clw3h8x9y0000qwertyui00888',
        gueltigBis: closingTs,
      });
      expect(result.isSuccess).toBe(true);
      expect(aggregate.version).toBe(2);
      expect(aggregate.gueltigBis).toEqual(closingTs);
      expect(aggregate.istAktiv).toBe(false);

      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as PsaProfilGeaendertEvent;
      expect(event.aktion).toBe('DEAKTIVIERT');
      expect(event.profil).toBe('CBRN_PATIENT');
      expect(event.zuweisungId).toBe(aggregate.id.value);
      expect(event.propagationGroupId).toBe('clw3h8x9y0000qwertyui00888');
      expect(event.begruendung).toBe('CBRN-Lage entschärft, Profil deaktivieren.');
    });

    it('(2) Versions-Mismatch liefert ConflictDetected-Sentinel mit aktueller Version', () => {
      const aggregate = makeActive();
      const result = aggregate.deactivate({
        expectedVersion: 99,
        userId: USER_ID,
        begruendung: 'Begründung egal',
        propagationGroupId: PROPAGATION_GROUP_ID,
      });
      expect(result.isFailure).toBe(true);
      // AC5 (Story 3.2): Aggregate-OCC trägt `:current=<n>` mit der tatsächlichen
      // Aggregate-Version, damit der Controller `currentVersion` in den 409-Body hebt.
      expect(result.error).toBe(`${PSA_PROFIL_CONFLICT_DETECTED}:current=1`);
    });

    it('(3) Doppel-Deaktivierung liefert BusinessRule-Sentinel', () => {
      const aggregate = makeActive();
      const first = aggregate.deactivate({
        expectedVersion: 1,
        userId: USER_ID,
        begruendung: 'erstmal deaktivieren',
        propagationGroupId: PROPAGATION_GROUP_ID,
      });
      expect(first.isSuccess).toBe(true);

      const second = aggregate.deactivate({
        expectedVersion: 2,
        userId: USER_ID,
        begruendung: 'noch mal',
        propagationGroupId: PROPAGATION_GROUP_ID,
      });
      expect(second.isFailure).toBe(true);
      expect(second.error).toContain('BusinessRule:PsaProfilBereitsDeaktiviert');
    });

    it('(4) leere Begründung wird abgelehnt', () => {
      const aggregate = makeActive();
      const result = aggregate.deactivate({
        expectedVersion: 1,
        userId: USER_ID,
        begruendung: '   ',
        propagationGroupId: PROPAGATION_GROUP_ID,
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('begruendung');
    });

    it('(5) gueltigBis < gueltigVon wird abgelehnt', () => {
      const aggregate = makeActive();
      const result = aggregate.deactivate({
        expectedVersion: 1,
        userId: USER_ID,
        begruendung: 'falsche Zeitachse',
        propagationGroupId: PROPAGATION_GROUP_ID,
        gueltigBis: new Date('2026-04-24T09:00:00.000Z'),
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('gueltigBis');
    });
  });
});
