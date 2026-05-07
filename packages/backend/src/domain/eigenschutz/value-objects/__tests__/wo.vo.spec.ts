import { Wo } from '../wo.vo';

describe('Wo VO (Story 5.1)', () => {
  it('(1) create() akzeptiert valide Koordinate', () => {
    const result = Wo.create({ kind: 'coordinate', longitude: 8.6821, latitude: 50.1109 });
    expect(result.isSuccess).toBe(true);
    expect(result.value!.kind).toBe('coordinate');
    expect(result.value!.toJSON()).toEqual({ kind: 'coordinate', longitude: 8.6821, latitude: 50.1109 });
  });

  it('(2) create() lehnt longitude < -180 ab', () => {
    const result = Wo.create({ kind: 'coordinate', longitude: -181, latitude: 0 });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/longitude/);
  });

  it('(3) create() lehnt latitude > 90 ab', () => {
    const result = Wo.create({ kind: 'coordinate', longitude: 0, latitude: 91 });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/latitude/);
  });

  it('(4) create() akzeptiert addressHint und trimmt', () => {
    const result = Wo.create({ kind: 'coordinate', longitude: 8, latitude: 50, addressHint: '  Hauptbahnhof  ' });
    expect(result.isSuccess).toBe(true);
    expect(result.value!.toJSON()).toEqual({ kind: 'coordinate', longitude: 8, latitude: 50, addressHint: 'Hauptbahnhof' });
  });

  it('(5) create() lehnt addressHint > 300 Zeichen ab', () => {
    const result = Wo.create({ kind: 'coordinate', longitude: 0, latitude: 0, addressHint: 'a'.repeat(301) });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/300/);
  });

  it('(6) create() akzeptiert Freitext und trimmt', () => {
    const result = Wo.create({ kind: 'freitext', text: '  Eingang Süd  ' });
    expect(result.isSuccess).toBe(true);
    expect(result.value!.toJSON()).toEqual({ kind: 'freitext', text: 'Eingang Süd' });
  });

  it('(7) create() lehnt leeren Freitext ab (Aggregate-Invariante: kein Verwechseln mit null-Sentinel)', () => {
    const result = Wo.create({ kind: 'freitext', text: '   ' });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/text/);
  });

  it('(8) create() lehnt Freitext > 480 Zeichen ab (JSON-Cap-Reserve)', () => {
    const result = Wo.create({ kind: 'freitext', text: 'a'.repeat(481) });
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/480/);
  });

  it('(9) Coordinate mit Maximal-addressHint produziert JSON ≤ 500 Zeichen (DB-Cap-Verträglichkeit)', () => {
    const result = Wo.create({ kind: 'coordinate', longitude: 179.99999, latitude: -89.99999, addressHint: 'a'.repeat(300) });
    expect(result.isSuccess).toBe(true);
    const json = JSON.stringify(result.value!.toJSON());
    expect(json.length).toBeLessThanOrEqual(500);
  });

  it('(10) equals() unterscheidet kind, Koordinate und Freitext-Text', () => {
    const a = Wo.create({ kind: 'coordinate', longitude: 8, latitude: 50 }).value!;
    const b = Wo.create({ kind: 'coordinate', longitude: 8, latitude: 50 }).value!;
    const c = Wo.create({ kind: 'freitext', text: 'X' }).value!;
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
