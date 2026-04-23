import { EigenschutzDomainEvent } from '../eigenschutz-domain-event';

/**
 * Unit-Spec für die Eigenschutz-Basisklasse (Story 1.7 AC1).
 *
 * Verifiziert die 6 Invarianten aus AC1:
 * 1. Pflichtfelder `einsatzId` + `userId` müssen gesetzt sein (Type-Level).
 * 2. `einheitId` ist optional (beide Varianten grün).
 * 3. `eventId` wird auto-generiert (CUID2-Format).
 * 4. `occurredAt` wird auto-generiert und liegt vor einem sehr nahen Future-
 *    Datum.
 * 5. `occurredOn`-Override wird durchgereicht (Rehydration-Szenario).
 * 6. `aggregateId` defaultet auf `undefined`, wenn nicht gesetzt.
 */
class TestEigenschutzEvent extends EigenschutzDomainEvent {
  static eventName(): string {
    return 'eigenschutz.test';
  }
}

describe('EigenschutzDomainEvent (Story 1.7 AC1)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const USER_ID = 'clw3h8x9y0000qwertyui00099';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const AGGREGATE_ID = 'clw3h8x9y0000qwertyui00777';

  it('(1) verlangt einsatzId + userId als Pflicht-Parameter (Runtime + Type-Level)', () => {
    const event = new TestEigenschutzEvent(EINSATZ_ID, USER_ID);
    expect(event.einsatzId).toBe(EINSATZ_ID);
    expect(event.userId).toBe(USER_ID);

    // Type-Level-Beleg: ohne Argumente oder mit nur einem Argument darf der
    // Konstruktor nicht kompilieren. Die `@ts-expect-error`-Direktive ist rot,
    // falls TypeScript den Aufruf irgendwann akzeptieren würde — dann wäre die
    // AC1-Invariante „einsatzId + userId Pflicht" gebrochen.
    // @ts-expect-error — einsatzId + userId fehlen
    () => new TestEigenschutzEvent();
    // @ts-expect-error — userId fehlt
    () => new TestEigenschutzEvent(EINSATZ_ID);
  });

  it('(2) akzeptiert einheitId optional — beide Varianten grün', () => {
    const ohne = new TestEigenschutzEvent(EINSATZ_ID, USER_ID);
    expect(ohne.einheitId).toBeUndefined();

    const mit = new TestEigenschutzEvent(EINSATZ_ID, USER_ID, EINHEIT_ID);
    expect(mit.einheitId).toBe(EINHEIT_ID);
  });

  it('(3) auto-generiert eventId als CUID2-Format', () => {
    const event = new TestEigenschutzEvent(EINSATZ_ID, USER_ID);
    expect(event.eventId).toMatch(/^[a-z0-9]{24}$/);
  });

  it('(4) auto-generiert occurredAt im Intervall zwischen Start und Ende des Konstruktor-Calls', () => {
    // CI-Container mit GC-Pause können > 10 ms zwischen before und after brauchen.
    // 1000 ms ist großzügig genug, ohne echte Regressionen zu verschleiern
    // (real sollte der Konstruktor < 1 ms dauern).
    const before = Date.now();
    const event = new TestEigenschutzEvent(EINSATZ_ID, USER_ID);
    const after = Date.now() + 1000;
    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('(5) reicht occurredOn-Override für Rehydration durch', () => {
    const past = new Date('2020-01-01T00:00:00Z');
    const event = new TestEigenschutzEvent(EINSATZ_ID, USER_ID, undefined, undefined, past);
    expect(event.occurredAt).toEqual(past);
  });

  it('(6) defaultet aggregateId auf undefined, wenn nicht übergeben', () => {
    const ohne = new TestEigenschutzEvent(EINSATZ_ID, USER_ID);
    expect(ohne.aggregateId).toBeUndefined();

    const mit = new TestEigenschutzEvent(EINSATZ_ID, USER_ID, undefined, AGGREGATE_ID);
    expect(mit.aggregateId).toBe(AGGREGATE_ID);
  });
});
