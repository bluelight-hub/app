import { EigenschutzVorfall, VORFALL_BEREITS_GESCHLOSSEN, VORFALL_WALLCLOCK_DRIFT } from '../eigenschutz-vorfall.aggregate';
import { VorfallGemeldetEvent } from '../../events/vorfall-gemeldet.event';
import { VorfallGeschlossenEvent } from '../../events/vorfall-geschlossen.event';
import { Beteiligter } from '../../value-objects/beteiligter.vo';
import { Wo } from '../../value-objects/wo.vo';
import { makeValidKontextSnapshot } from './__fixtures__/make-valid-kontext-snapshot';

describe('EigenschutzVorfall Aggregate (Story 5.1 + 5.2)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui05001';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui05002';
  const USER_ID = 'clw3h8x9y0000qwertyui05003';
  const NOW = new Date('2026-05-06T10:00:00.000Z');

  function buildBaseProps(overrides: Partial<Parameters<typeof EigenschutzVorfall.create>[0]> = {}) {
    return {
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      vorfallZeit: NOW,
      wann: NOW,
      was: 'Sturz beim Aufstieg',
      wo: null,
      beteiligte: [],
      massnahmen: '',
      unfallkasseRelevant: false,
      erfasstVonUserId: USER_ID,
      kontextSnapshot: makeValidKontextSnapshot({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID }),
      now: NOW,
      ...overrides,
    };
  }

  it('(1) create() liefert Success und Initialwerte mit V1-Snapshot (Story 5.2)', () => {
    const result = EigenschutzVorfall.create(buildBaseProps());
    expect(result.isSuccess).toBe(true);
    const aggregate = result.value!;
    expect(aggregate.einsatzId).toBe(EINSATZ_ID);
    expect(aggregate.einheitId).toBe(EINHEIT_ID);
    expect(aggregate.was).toBe('Sturz beim Aufstieg');
    expect(aggregate.wo).toBeNull();
    expect(aggregate.unfallkasseRelevant).toBe(false);
    expect(aggregate.kontextSnapshot.schemaVersion).toBe(1);
    expect(aggregate.gefBeurteilungVersionId).toBeNull();
  });

  it('(2) create() emittiert genau ein VorfallGemeldetEvent mit korrekten Audit-Feldern', () => {
    const aggregate = EigenschutzVorfall.create(buildBaseProps({ unfallkasseRelevant: true })).value!;
    const events = aggregate.getDomainEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as VorfallGemeldetEvent;
    expect(event).toBeInstanceOf(VorfallGemeldetEvent);
    expect(event.einsatzId).toBe(EINSATZ_ID);
    expect(event.userId).toBe(USER_ID);
    expect(event.einheitId).toBe(EINHEIT_ID);
    expect(event.vorfallId).toBe(aggregate.id.value);
    expect(event.unfallkasseRelevant).toBe(true);
    expect(event.vorfallZeit).toEqual(NOW);
  });

  it('(3) create() lehnt leere "was"-Beschreibung ab', () => {
    const result = EigenschutzVorfall.create(buildBaseProps({ was: '   ' }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/was/);
  });

  it('(4) create() lehnt zu lange "was"-Beschreibung (>80) ab', () => {
    const result = EigenschutzVorfall.create(buildBaseProps({ was: 'a'.repeat(81) }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/80/);
  });

  it('(5) create() trimmt "was" und persistiert getrimmten Wert', () => {
    const aggregate = EigenschutzVorfall.create(buildBaseProps({ was: '  Stolper-Unfall  ' })).value!;
    expect(aggregate.was).toBe('Stolper-Unfall');
  });

  it('(6) create() lehnt "vorfallZeit" mit > 5 min Future-Drift ab (Wallclock-Slack)', () => {
    const future = new Date(NOW.getTime() + 6 * 60 * 1000);
    const result = EigenschutzVorfall.create(buildBaseProps({ vorfallZeit: future, wann: future }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(VORFALL_WALLCLOCK_DRIFT);
  });

  it('(7) create() akzeptiert "vorfallZeit" innerhalb des 5-min-Slacks', () => {
    const slightlyFuture = new Date(NOW.getTime() + 4 * 60 * 1000);
    const result = EigenschutzVorfall.create(buildBaseProps({ vorfallZeit: slightlyFuture, wann: slightlyFuture }));
    expect(result.isSuccess).toBe(true);
  });

  it('(8) create() akzeptiert wo=Wo-VO und Mix-Beteiligte', () => {
    const wo = Wo.create({ kind: 'freitext', text: 'Eingang Süd' }).value!;
    const beteiligte = [Beteiligter.create({ kind: 'einsatzPerson', einsatzPersonId: USER_ID }).value!, Beteiligter.create({ kind: 'freitext', name: 'Max Mustermann', rolle: 'Sanitäter' }).value!];
    const aggregate = EigenschutzVorfall.create(buildBaseProps({ wo, beteiligte })).value!;
    expect(aggregate.wo).toBe(wo);
    expect(aggregate.beteiligte).toHaveLength(2);
    expect(aggregate.beteiligte[0]).toEqual({ kind: 'einsatzPerson', einsatzPersonId: USER_ID });
    expect(aggregate.beteiligte[1]).toEqual({ kind: 'freitext', name: 'Max Mustermann', rolle: 'Sanitäter' });
  });

  it('(9) create() lehnt rohe Beteiligter-Plain-Objects ab (VO-Pflicht)', () => {
    const result = EigenschutzVorfall.create(
      buildBaseProps({
        // eslint-disable-next-line typescript/no-explicit-any -- forced raw object for guard test
        beteiligte: [{ kind: 'einsatzPerson', einsatzPersonId: USER_ID } as any],
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/Beteiligter-VO/);
  });

  it('(10) create() lehnt zu lange massnahmen (>4000) ab', () => {
    const result = EigenschutzVorfall.create(buildBaseProps({ massnahmen: 'a'.repeat(4001) }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/4000/);
  });

  it('(11) create() akzeptiert leere massnahmen (Epic „optional")', () => {
    const result = EigenschutzVorfall.create(buildBaseProps({ massnahmen: '' }));
    expect(result.isSuccess).toBe(true);
    expect(result.value!.massnahmen).toBe('');
  });

  it('(12) create() lehnt nicht-V1-konformen kontextSnapshot ab (Story 5.2)', () => {
    const result = EigenschutzVorfall.create(
      buildBaseProps({
        // eslint-disable-next-line typescript/no-explicit-any -- forced array for guard test
        kontextSnapshot: [] as any,
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^ValidationFailed:KontextSnapshot:SchemaParseError/);
  });

  it('(12a) create() lehnt 5.1-Stub `{}` ab (V1-Snapshot ist Pflicht ab Story 5.2)', () => {
    const result = EigenschutzVorfall.create(buildBaseProps({ kontextSnapshot: {} }));
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^ValidationFailed:KontextSnapshot:SchemaParseError/);
  });

  it('(12b) create() leitet gefBeurteilungVersionId aus dem Snapshot ab', () => {
    const versionId = 'cl9gbversion123456789012';
    const snapshot = makeValidKontextSnapshot({
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      gefaehrdungsbeurteilung: {
        versionId,
        version: 1,
        gueltigVon: '2026-05-01T08:00:00.000+02:00',
        items: [{ title: 'Glatteis' }],
      },
    });
    const aggregate = EigenschutzVorfall.create(buildBaseProps({ kontextSnapshot: snapshot })).value!;
    expect(aggregate.gefBeurteilungVersionId).toBe(versionId);
  });

  it('(13) Aggregate hat KEIN update() und KEIN delete() (append-only)', () => {
    const aggregate = EigenschutzVorfall.create(buildBaseProps()).value!;
    // eslint-disable-next-line typescript/no-explicit-any -- runtime contract verification
    expect(typeof (aggregate as any).update).toBe('undefined');
    // eslint-disable-next-line typescript/no-explicit-any -- runtime contract verification
    expect(typeof (aggregate as any).delete).toBe('undefined');
  });

  describe('close() (Issue #415)', () => {
    const CLOSER_USER_ID = 'clw3h8x9y0000qwertyui05099';
    const CLOSED_AT = new Date('2026-05-07T15:30:00.000Z');

    it('close() erfolgreich auf offenem Vorfall — Felder gesetzt, Event emittiert', () => {
      const aggregate = EigenschutzVorfall.create(buildBaseProps()).value!;
      // Vorab-Events aus create() leeren, damit close() isoliert geprüft werden kann.
      aggregate.clearDomainEvents();
      const result = aggregate.close(CLOSER_USER_ID, 'Vorfall ist abgearbeitet', CLOSED_AT);
      expect(result.isSuccess).toBe(true);
      expect(aggregate.isGeschlossen).toBe(true);
      expect(aggregate.geschlossenAm).toEqual(CLOSED_AT);
      expect(aggregate.geschlossenVonUserId).toBe(CLOSER_USER_ID);
      expect(aggregate.schliessungsBegruendung).toBe('Vorfall ist abgearbeitet');
      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as VorfallGeschlossenEvent;
      expect(event).toBeInstanceOf(VorfallGeschlossenEvent);
      expect(event.vorfallId).toBe(aggregate.id.value);
      expect(event.geschlossenAm).toEqual(CLOSED_AT);
      expect(event.userId).toBe(CLOSER_USER_ID);
    });

    it('close() ohne Begründung — `schliessungsBegruendung` bleibt null', () => {
      const aggregate = EigenschutzVorfall.create(buildBaseProps()).value!;
      aggregate.clearDomainEvents();
      const result = aggregate.close(CLOSER_USER_ID, undefined, CLOSED_AT);
      expect(result.isSuccess).toBe(true);
      expect(aggregate.schliessungsBegruendung).toBeNull();
    });

    it('close() mit Empty-String-Begründung → null', () => {
      const aggregate = EigenschutzVorfall.create(buildBaseProps()).value!;
      aggregate.clearDomainEvents();
      const result = aggregate.close(CLOSER_USER_ID, '   ', CLOSED_AT);
      expect(result.isSuccess).toBe(true);
      expect(aggregate.schliessungsBegruendung).toBeNull();
    });

    it('close() trimmt zu lange Begründung ab (>500) — Failure', () => {
      const aggregate = EigenschutzVorfall.create(buildBaseProps()).value!;
      aggregate.clearDomainEvents();
      const result = aggregate.close(CLOSER_USER_ID, 'a'.repeat(501), CLOSED_AT);
      expect(result.isFailure).toBe(true);
      expect(aggregate.isGeschlossen).toBe(false);
    });

    it('close() Idempotenz — zweiter Aufruf liefert VorfallBereitsGeschlossen', () => {
      const aggregate = EigenschutzVorfall.create(buildBaseProps()).value!;
      aggregate.clearDomainEvents();
      const first = aggregate.close(CLOSER_USER_ID, 'erste Begründung', CLOSED_AT);
      expect(first.isSuccess).toBe(true);
      const second = aggregate.close(CLOSER_USER_ID, 'zweite Begründung', new Date(CLOSED_AT.getTime() + 60_000));
      expect(second.isFailure).toBe(true);
      expect(second.error).toBe(VORFALL_BEREITS_GESCHLOSSEN);
      // Original-Closure-Daten unverändert nach zweitem Versuch.
      expect(aggregate.geschlossenAm).toEqual(CLOSED_AT);
      expect(aggregate.schliessungsBegruendung).toBe('erste Begründung');
    });

    it('close() lehnt leere userId ab', () => {
      const aggregate = EigenschutzVorfall.create(buildBaseProps()).value!;
      aggregate.clearDomainEvents();
      const result = aggregate.close('   ', 'Begründung', CLOSED_AT);
      expect(result.isFailure).toBe(true);
      expect(aggregate.isGeschlossen).toBe(false);
    });

    it('reconstitute() mit Closure-Feldern liefert geschlossenes Aggregate', () => {
      const id = 'clw3h8x9y0000qwertyui05060';
      const result = EigenschutzVorfall.reconstitute({
        id,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        vorfallZeit: NOW,
        wann: NOW,
        was: 'Sturz',
        wo: null,
        beteiligte: [],
        massnahmen: '',
        unfallkasseRelevant: false,
        erfasstVonUserId: USER_ID,
        erfasstAm: NOW,
        kontextSnapshot: {},
        gefBeurteilungVersionId: null,
        geschlossenAm: CLOSED_AT,
        geschlossenVonUserId: CLOSER_USER_ID,
        schliessungsBegruendung: 'Bereits geschlossen',
      });
      expect(result.isSuccess).toBe(true);
      const aggregate = result.value!;
      expect(aggregate.isGeschlossen).toBe(true);
      expect(aggregate.geschlossenAm).toEqual(CLOSED_AT);
      expect(aggregate.geschlossenVonUserId).toBe(CLOSER_USER_ID);
      expect(aggregate.schliessungsBegruendung).toBe('Bereits geschlossen');
    });

    it('reconstitute() lehnt Inkonsistenz `geschlossenAm` ohne `geschlossenVonUserId` ab', () => {
      const result = EigenschutzVorfall.reconstitute({
        id: 'clw3h8x9y0000qwertyui05061',
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        vorfallZeit: NOW,
        wann: NOW,
        was: 'Sturz',
        wo: null,
        beteiligte: [],
        massnahmen: '',
        unfallkasseRelevant: false,
        erfasstVonUserId: USER_ID,
        erfasstAm: NOW,
        kontextSnapshot: {},
        gefBeurteilungVersionId: null,
        geschlossenAm: CLOSED_AT,
        geschlossenVonUserId: null,
        schliessungsBegruendung: null,
      });
      expect(result.isFailure).toBe(true);
    });
  });

  it('(14) reconstitute() erzeugt Aggregate ohne Event-Emission', () => {
    const id = 'clw3h8x9y0000qwertyui05050';
    const erfasstAm = new Date('2026-05-06T09:55:00.000Z');
    const result = EigenschutzVorfall.reconstitute({
      id,
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      vorfallZeit: NOW,
      wann: NOW,
      was: 'Sturz',
      wo: null,
      beteiligte: [],
      massnahmen: '',
      unfallkasseRelevant: false,
      erfasstVonUserId: USER_ID,
      erfasstAm,
      kontextSnapshot: {},
      gefBeurteilungVersionId: null,
    });
    expect(result.isSuccess).toBe(true);
    const aggregate = result.value!;
    expect(aggregate.id.value).toBe(id);
    expect(aggregate.getDomainEvents()).toHaveLength(0);
    expect(aggregate.erfasstAm).toEqual(erfasstAm);
  });
});
