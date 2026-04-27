import { SicherheitsregelAusgerufenEvent } from '../../events/sicherheitsregel-ausgerufen.event';
import { SicherheitsregelQuittiertEvent } from '../../events/sicherheitsregel-quittiert.event';
import {
  SICHERHEITSREGEL_BUSINESS_RULE_REGEL_ABGEKUENDIGT,
  SICHERHEITSREGEL_BUSINESS_RULE_REGEL_TRIFFT_NICHT_AUF_EINHEIT,
  SICHERHEITSREGEL_CONFLICT_DETECTED,
  SICHERHEITSREGEL_NO_CHANGES_DETECTED,
  Sicherheitsregel,
} from '../sicherheitsregel.aggregate';

describe('Sicherheitsregel Aggregate (Story 2.6)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const USER_ID = 'clw3h8x9y0000qwertyui00099';
  const PROPAGATION_GROUP_ID = 'clw3h8x9y0000qwertyui00777';

  function validCreateProps(overrides: Partial<Parameters<typeof Sicherheitsregel.create>[0]> = {}): Parameters<typeof Sicherheitsregel.create>[0] {
    return {
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      titel: 'Kein Zutritt ohne Atemschutz',
      inhalt: 'Der Gefahrenbereich nördlich der Halle ist ausschließlich mit umluftunabhängigem Atemschutz zu betreten.',
      erstelltVonUserId: USER_ID,
      propagationGroupId: PROPAGATION_GROUP_ID,
      ...overrides,
    };
  }

  describe('create()', () => {
    it('(1) Happy-Path: liefert Success, setzt Initialwerte und emittiert ein Event mit { created: true }', () => {
      const result = Sicherheitsregel.create(validCreateProps());

      expect(result.isSuccess).toBe(true);
      const aggregate = result.value!;
      expect(aggregate.einsatzId).toBe(EINSATZ_ID);
      expect(aggregate.einheitId).toBe(EINHEIT_ID);
      expect(aggregate.einsatzweit).toBe(false);
      expect(aggregate.titel).toBe('Kein Zutritt ohne Atemschutz');
      expect(aggregate.version).toBe(1);
      expect(aggregate.erstelltVonUserId).toBe(USER_ID);
      expect(aggregate.aktualisiertVonUserId).toBe(USER_ID);

      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as SicherheitsregelAusgerufenEvent;
      expect(event).toBeInstanceOf(SicherheitsregelAusgerufenEvent);
      expect(event.einsatzId).toBe(EINSATZ_ID);
      expect(event.userId).toBe(USER_ID);
      expect(event.einheitId).toBe(EINHEIT_ID);
      expect(event.regelId).toBe(aggregate.id.value);
      expect(event.propagationGroupId).toBe(PROPAGATION_GROUP_ID);
      expect(event.fromVersion).toBeNull();
      expect(event.toVersion).toBe(1);
      expect(event.changedFields).toEqual({ created: true });
    });

    it('(2) einheitId = null erzeugt einsatzweit-Flag und Event ohne einheitId', () => {
      const result = Sicherheitsregel.create(validCreateProps({ einheitId: null }));

      expect(result.isSuccess).toBe(true);
      const aggregate = result.value!;
      expect(aggregate.einheitId).toBeNull();
      expect(aggregate.einsatzweit).toBe(true);

      const event = aggregate.getDomainEvents()[0] as SicherheitsregelAusgerufenEvent;
      expect(event.einheitId).toBeUndefined();
    });

    it('(3) trimmt Titel und Inhalt vor Persistierung', () => {
      const result = Sicherheitsregel.create(validCreateProps({ titel: '   Trim mich   ', inhalt: '  Regel-Text  ' }));

      expect(result.isSuccess).toBe(true);
      const aggregate = result.value!;
      expect(aggregate.titel).toBe('Trim mich');
      expect(aggregate.inhalt).toBe('Regel-Text');

      const event = aggregate.getDomainEvents()[0] as SicherheitsregelAusgerufenEvent;
      expect(event.titel).toBe('Trim mich');
      expect(event.inhalt).toBe('Regel-Text');
    });

    it('(4) lehnt leeren Titel ab', () => {
      const result = Sicherheitsregel.create(validCreateProps({ titel: '   ' }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/titel/i);
    });

    it('(5) lehnt Titel > 80 Zeichen ab', () => {
      const overlong = 'X'.repeat(81);
      const result = Sicherheitsregel.create(validCreateProps({ titel: overlong }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/titel/i);
      expect(result.error).toMatch(/80/);
    });

    it('(6) akzeptiert Titel mit genau 80 Zeichen nach trim (Boundary)', () => {
      const boundary = 'X'.repeat(80);
      const result = Sicherheitsregel.create(validCreateProps({ titel: boundary }));
      expect(result.isSuccess).toBe(true);
    });

    it('(7) lehnt leeren Inhalt ab', () => {
      const result = Sicherheitsregel.create(validCreateProps({ inhalt: '' }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/inhalt/i);
    });

    it('(8) lehnt Inhalt > 2000 Zeichen ab', () => {
      const overlong = 'Y'.repeat(2001);
      const result = Sicherheitsregel.create(validCreateProps({ inhalt: overlong }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/inhalt/i);
      expect(result.error).toMatch(/2000/);
    });

    it('(9) lehnt leeren einsatzId ab', () => {
      const result = Sicherheitsregel.create(validCreateProps({ einsatzId: '' }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/einsatzId/);
    });

    it('(10) lehnt leeren erstelltVonUserId ab', () => {
      const result = Sicherheitsregel.create(validCreateProps({ erstelltVonUserId: '' }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/erstelltVonUserId/);
    });

    it('(11) lehnt leere propagationGroupId ab', () => {
      const result = Sicherheitsregel.create(validCreateProps({ propagationGroupId: '' }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/propagationGroupId/);
    });

    it('(12) lehnt einheitId = "" (leerer String) ab — nur null oder non-empty erlaubt', () => {
      const result = Sicherheitsregel.create(validCreateProps({ einheitId: '' }));
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/einheitId/);
    });
  });

  describe('reconstitute()', () => {
    const baseProps = {
      id: 'clw3h8x9y0000qwertyui00123',
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      titel: 'Gesperrter Bereich',
      inhalt: 'Zugang nur mit Freigabe durch die Einsatzleitung.',
      version: 3,
      erstelltVonUserId: USER_ID,
      aktualisiertVonUserId: USER_ID,
    };

    it('(13) liefert Result.ok mit gegebenen Werten und emittiert KEIN Event', () => {
      const result = Sicherheitsregel.reconstitute(baseProps);
      expect(result.isSuccess).toBe(true);

      const aggregate = result.value!;
      expect(aggregate.version).toBe(3);
      expect(aggregate.id.value).toBe(baseProps.id);
      expect(aggregate.titel).toBe('Gesperrter Bereich');
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('(14) liefert Result.fail bei version < 1', () => {
      const result = Sicherheitsregel.reconstitute({ ...baseProps, version: 0 });
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/version/i);
    });

    it('(15) liefert Result.fail bei nicht-Integer Version', () => {
      const result = Sicherheitsregel.reconstitute({ ...baseProps, version: 1.5 });
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/version/i);
    });

    it('(16) liefert Result.fail bei ungültiger CUID', () => {
      const result = Sicherheitsregel.reconstitute({ ...baseProps, id: 'kein-cuid' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/ID/);
    });

    it('(17) liefert Result.fail bei leerem aktualisiertVonUserId', () => {
      const result = Sicherheitsregel.reconstitute({ ...baseProps, aktualisiertVonUserId: '' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/aktualisiertVonUserId/);
    });
  });

  describe('update()', () => {
    function buildFreshAggregate(): Sicherheitsregel {
      const aggregate = Sicherheitsregel.create(validCreateProps()).value!;
      aggregate.clearDomainEvents();
      return aggregate;
    }

    const NEW_PROPAGATION_ID = 'clw3h8x9y0000qwertyui00888';
    const OTHER_USER_ID = 'clw3h8x9y0000qwertyui00111';

    it('(18) Happy-Path mit Titel-Änderung: erhöht Version von 1 auf 2 und emittiert Event mit { updated: ["titel"] }', () => {
      const aggregate = buildFreshAggregate();

      const result = aggregate.update({ titel: 'Neuer Titel', inhalt: aggregate.inhalt, einheitId: aggregate.einheitId }, 1, OTHER_USER_ID, NEW_PROPAGATION_ID);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.version).toBe(2);
      expect(aggregate.titel).toBe('Neuer Titel');
      expect(aggregate.aktualisiertVonUserId).toBe(OTHER_USER_ID);

      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as SicherheitsregelAusgerufenEvent;
      expect(event.fromVersion).toBe(1);
      expect(event.toVersion).toBe(2);
      expect(event.userId).toBe(OTHER_USER_ID);
      expect(event.propagationGroupId).toBe(NEW_PROPAGATION_ID);
      expect(event.changedFields).toEqual({ updated: ['titel'] });
    });

    it('(19) Version-Mismatch liefert ConflictDetected-Sentinel und hält Aggregate unverändert', () => {
      const aggregate = buildFreshAggregate();

      const result = aggregate.update({ titel: 'Neu', inhalt: aggregate.inhalt, einheitId: aggregate.einheitId }, 42, OTHER_USER_ID, NEW_PROPAGATION_ID);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SICHERHEITSREGEL_CONFLICT_DETECTED);
      expect(aggregate.version).toBe(1);
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('(20) No-Op-Update (keine Feld-Änderung) liefert BusinessRule:NoChangesDetected', () => {
      const aggregate = buildFreshAggregate();

      const result = aggregate.update({ titel: aggregate.titel, inhalt: aggregate.inhalt, einheitId: aggregate.einheitId }, 1, OTHER_USER_ID, NEW_PROPAGATION_ID);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SICHERHEITSREGEL_NO_CHANGES_DETECTED);
      expect(aggregate.version).toBe(1);
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('(21) Whitespace-only-Unterschied zählt NICHT als Change (Trim-Normalisierung)', () => {
      const aggregate = buildFreshAggregate();

      const result = aggregate.update({ titel: `  ${aggregate.titel}  `, inhalt: `  ${aggregate.inhalt}  `, einheitId: aggregate.einheitId }, 1, OTHER_USER_ID, NEW_PROPAGATION_ID);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SICHERHEITSREGEL_NO_CHANGES_DETECTED);
    });

    it('(22) Einheit-Wechsel von konkreter Einheit auf einsatzweit (null) erscheint in changedFields', () => {
      const aggregate = buildFreshAggregate();

      const result = aggregate.update({ titel: aggregate.titel, inhalt: aggregate.inhalt, einheitId: null }, 1, OTHER_USER_ID, NEW_PROPAGATION_ID);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.einsatzweit).toBe(true);

      const event = aggregate.getDomainEvents()[0] as SicherheitsregelAusgerufenEvent;
      expect(event.changedFields).toEqual({ updated: ['einheitId'] });
      expect(event.einheitId).toBeUndefined();
    });

    it('(23) Multi-Feld-Update listet alle geänderten Felder deterministisch', () => {
      const aggregate = buildFreshAggregate();

      const result = aggregate.update({ titel: 'Anderer Titel', inhalt: 'Anderer Inhalt', einheitId: null }, 1, OTHER_USER_ID, NEW_PROPAGATION_ID);

      expect(result.isSuccess).toBe(true);
      const event = aggregate.getDomainEvents()[0] as SicherheitsregelAusgerufenEvent;
      expect(event.changedFields.updated).toEqual(['titel', 'inhalt', 'einheitId']);
    });

    it('(24) lehnt zu langen Titel auch im Update-Pfad ab (Version bleibt unverändert)', () => {
      const aggregate = buildFreshAggregate();
      const overlong = 'Z'.repeat(81);

      const result = aggregate.update({ titel: overlong, inhalt: aggregate.inhalt, einheitId: aggregate.einheitId }, 1, OTHER_USER_ID, NEW_PROPAGATION_ID);

      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/titel/i);
      expect(aggregate.version).toBe(1);
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('(25) mehrfaches update() inkrementiert Version schrittweise', () => {
      const aggregate = buildFreshAggregate();
      aggregate.update({ titel: 'V2-Titel', inhalt: aggregate.inhalt, einheitId: aggregate.einheitId }, 1, OTHER_USER_ID, NEW_PROPAGATION_ID);
      aggregate.update({ titel: 'V3-Titel', inhalt: aggregate.inhalt, einheitId: aggregate.einheitId }, 2, OTHER_USER_ID, NEW_PROPAGATION_ID);
      aggregate.update({ titel: 'V4-Titel', inhalt: aggregate.inhalt, einheitId: aggregate.einheitId }, 3, OTHER_USER_ID, NEW_PROPAGATION_ID);

      expect(aggregate.version).toBe(4);
      expect(aggregate.getDomainEvents()).toHaveLength(3);
    });
  });

  describe('deprecate()', () => {
    function buildFreshAggregate(): Sicherheitsregel {
      const aggregate = Sicherheitsregel.create(validCreateProps()).value!;
      aggregate.clearDomainEvents();
      return aggregate;
    }

    const REWIRE_GROUP_ID = 'clw3h8x9y0000qwertyui00999';
    const REWIRE_USER_ID = 'clw3h8x9y0000qwertyui00222';

    it('(26) emittiert Event mit { deprecated: true } und lässt version unverändert', () => {
      const aggregate = buildFreshAggregate();
      const versionBefore = aggregate.version;

      const result = aggregate.deprecate(REWIRE_USER_ID, REWIRE_GROUP_ID);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.version).toBe(versionBefore);
      expect(aggregate.aktualisiertVonUserId).toBe(REWIRE_USER_ID);

      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as SicherheitsregelAusgerufenEvent;
      expect(event.changedFields).toEqual({ deprecated: true });
      expect(event.fromVersion).toBe(versionBefore);
      expect(event.toVersion).toBe(versionBefore);
      expect(event.propagationGroupId).toBe(REWIRE_GROUP_ID);
      expect(event.userId).toBe(REWIRE_USER_ID);
    });

    it('(27) deprecate nach bereits erhöhter Version behält die aktuelle Version (fromVersion === toVersion)', () => {
      const aggregate = buildFreshAggregate();
      aggregate.update({ titel: 'V2', inhalt: aggregate.inhalt, einheitId: aggregate.einheitId }, 1, REWIRE_USER_ID, REWIRE_GROUP_ID);
      aggregate.clearDomainEvents();

      const result = aggregate.deprecate(REWIRE_USER_ID, REWIRE_GROUP_ID);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.version).toBe(2);
      const event = aggregate.getDomainEvents()[0] as SicherheitsregelAusgerufenEvent;
      expect(event.fromVersion).toBe(2);
      expect(event.toVersion).toBe(2);
    });

    it('(28) lehnt leeren userId ab und emittiert kein Event', () => {
      const aggregate = buildFreshAggregate();

      const result = aggregate.deprecate('', REWIRE_GROUP_ID);

      expect(result.isFailure).toBe(true);
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('(29) lehnt leere propagationGroupId ab und emittiert kein Event', () => {
      const aggregate = buildFreshAggregate();

      const result = aggregate.deprecate(REWIRE_USER_ID, '   ');

      expect(result.isFailure).toBe(true);
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('(30) flippt _istAktiv auf false nach erfolgreichem deprecate', () => {
      const aggregate = buildFreshAggregate();
      expect(aggregate.istAktiv).toBe(true);

      aggregate.deprecate(REWIRE_USER_ID, REWIRE_GROUP_ID);

      expect(aggregate.istAktiv).toBe(false);
    });
  });

  describe('acknowledge() — Story 2.7', () => {
    function buildFreshAggregate(overrides: Partial<Parameters<typeof Sicherheitsregel.create>[0]> = {}): Sicherheitsregel {
      const aggregate = Sicherheitsregel.create(validCreateProps(overrides)).value!;
      aggregate.clearDomainEvents();
      return aggregate;
    }

    const ACK_USER_ID = 'clw3h8x9y0000qwertyui00333';

    it('(31) Happy-Path: einheitenspezifische Regel + matching einheitId → Result.ok mit QuittiertEvent', () => {
      const aggregate = buildFreshAggregate();

      const result = aggregate.acknowledge(EINHEIT_ID, ACK_USER_ID);

      expect(result.isSuccess).toBe(true);
      const event = result.value!.event;
      expect(event).toBeInstanceOf(SicherheitsregelQuittiertEvent);
      expect(event.einsatzId).toBe(EINSATZ_ID);
      expect(event.userId).toBe(ACK_USER_ID);
      expect(event.einheitId).toBe(EINHEIT_ID);
      expect(event.regelId).toBe(aggregate.id.value);
      expect(event.propagationGroupId).toBeNull();
      expect(event.quittiertAm).toBeInstanceOf(Date);
    });

    it('(32) Happy-Path: einsatzweite Regel (einheitId=null) + beliebige einheitId → Result.ok', () => {
      const aggregate = buildFreshAggregate({ einheitId: null });
      const FREMDE_EINHEIT_ID = 'clw3h8x9y0000qwertyui00444';

      const result = aggregate.acknowledge(FREMDE_EINHEIT_ID, ACK_USER_ID);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.event.einheitId).toBe(FREMDE_EINHEIT_ID);
    });

    it('(33) lehnt deprecated Regel ab → BusinessRule:RegelAbgekuendigt', () => {
      const aggregate = buildFreshAggregate();
      const REWIRE_GROUP_ID = 'clw3h8x9y0000qwertyui00999';
      aggregate.deprecate(ACK_USER_ID, REWIRE_GROUP_ID);
      aggregate.clearDomainEvents();

      const result = aggregate.acknowledge(EINHEIT_ID, ACK_USER_ID);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SICHERHEITSREGEL_BUSINESS_RULE_REGEL_ABGEKUENDIGT);
    });

    it('(34) lehnt nicht-passende einheitId ab (konkrete Regel, fremde Einheit)', () => {
      const aggregate = buildFreshAggregate();
      const FREMDE_EINHEIT_ID = 'clw3h8x9y0000qwertyui00555';

      const result = aggregate.acknowledge(FREMDE_EINHEIT_ID, ACK_USER_ID);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SICHERHEITSREGEL_BUSINESS_RULE_REGEL_TRIFFT_NICHT_AUF_EINHEIT);
    });

    it('(35) lehnt leere userId ab → Invariant:InvalidId:userId', () => {
      const aggregate = buildFreshAggregate();

      const result = aggregate.acknowledge(EINHEIT_ID, '');

      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/Invariant:InvalidId/);
    });

    it('(36) lehnt leere einheitId ab → Invariant:InvalidId:einheitId', () => {
      const aggregate = buildFreshAggregate();

      const result = aggregate.acknowledge('   ', ACK_USER_ID);

      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/Invariant:InvalidId/);
    });

    it('(37) Reconstitute mit istAktiv=false → acknowledge schlägt fehl (Repository-Pfad konsistent)', () => {
      const reconResult = Sicherheitsregel.reconstitute({
        id: 'clw3h8x9y0000qwertyui00123',
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        titel: 'Deprecated regel',
        inhalt: 'Diese Regel wurde abgekündigt',
        version: 2,
        erstelltVonUserId: USER_ID,
        aktualisiertVonUserId: USER_ID,
        istAktiv: false,
      });
      expect(reconResult.isSuccess).toBe(true);
      const aggregate = reconResult.value!;

      const result = aggregate.acknowledge(EINHEIT_ID, ACK_USER_ID);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(SICHERHEITSREGEL_BUSINESS_RULE_REGEL_ABGEKUENDIGT);
    });

    it('(38) acknowledge wirft niemals — alle Pfade liefern Result (defense-in-depth)', () => {
      const aggregate = buildFreshAggregate();
      // Stress-Test: alle Pfade
      expect(() => aggregate.acknowledge('', '')).not.toThrow();
      expect(() => aggregate.acknowledge(EINHEIT_ID, ACK_USER_ID)).not.toThrow();
      expect(() => aggregate.acknowledge('not-matching', ACK_USER_ID)).not.toThrow();
    });
  });
});
