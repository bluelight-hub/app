import { describe, expect, it } from 'vitest';
import type { EinsatzEinheitDto } from '@bluelight-hub/shared/client';
import { MAX_EINHEIT_IDS, resolveAbschnittToEinheitIds } from '../resolve-abschnitt-einheiten';

function makeEinheit(id: string, typ: EinsatzEinheitDto['typ'], parentId: string | null = null): EinsatzEinheitDto {
  return {
    id,
    einsatzId: 'einsatz-1',
    parentId: parentId as unknown as EinsatzEinheitDto['parentId'],
    name: id,
    typ,
    status: 'EINSATZBEREIT' as EinsatzEinheitDto['status'],
    sollStaerke: 0,
    istStaerke: 0,
  } as EinsatzEinheitDto;
}

describe('resolveAbschnittToEinheitIds (Story 5.3 AC4)', () => {
  it('(R1) leere Eingabe → []', () => {
    const result = resolveAbschnittToEinheitIds([], []);
    expect(result.einheitIds).toEqual([]);
    expect(result.truncated).toBe(false);
  });

  it('(R2) einzelner Abschnitt mit 2 direkten Untereinheiten → 3 IDs', () => {
    const einheiten = [
      makeEinheit('aaaaaaaaaaaaaaaaaaaaaaaaaa', 'ABSCHNITT'),
      makeEinheit('bbbbbbbbbbbbbbbbbbbbbbbbbb', 'TRUPP', 'aaaaaaaaaaaaaaaaaaaaaaaaaa'),
      makeEinheit('cccccccccccccccccccccccccc', 'TRUPP', 'aaaaaaaaaaaaaaaaaaaaaaaaaa'),
    ];
    const result = resolveAbschnittToEinheitIds(['aaaaaaaaaaaaaaaaaaaaaaaaaa'], einheiten);
    expect(result.einheitIds.slice().sort()).toEqual(['aaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbbbb', 'cccccccccccccccccccccccccc']);
    expect(result.truncated).toBe(false);
  });

  it('(R3) mehrere Abschnitte mit Überlappung → Dedup', () => {
    // Edge: ein Abschnitt B ist gleichzeitig Kind von Abschnitt A (modellhaft selten,
    // aber als Defense getestet). Wir wählen A und B explizit aus.
    const einheiten = [
      makeEinheit('aaaaaaaaaaaaaaaaaaaaaaaaaa', 'ABSCHNITT'),
      makeEinheit('bbbbbbbbbbbbbbbbbbbbbbbbbb', 'ABSCHNITT', 'aaaaaaaaaaaaaaaaaaaaaaaaaa'),
      makeEinheit('cccccccccccccccccccccccccc', 'TRUPP', 'bbbbbbbbbbbbbbbbbbbbbbbbbb'),
    ];
    const result = resolveAbschnittToEinheitIds(['aaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbbbb'], einheiten);
    expect(new Set(result.einheitIds)).toEqual(new Set(['aaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbbbb', 'cccccccccccccccccccccccccc']));
    expect(result.einheitIds.length).toBe(3); // Dedup, kein Doppel-Eintrag
  });

  it('(R4) Zykel-Defense: parent zeigt zurück auf Vorfahren, kein Endlos-Loop', () => {
    // A ist parent von B, B ist parent von A (artifizieller Zykel).
    const einheiten = [makeEinheit('aaaaaaaaaaaaaaaaaaaaaaaaaa', 'ABSCHNITT', 'bbbbbbbbbbbbbbbbbbbbbbbbbb'), makeEinheit('bbbbbbbbbbbbbbbbbbbbbbbbbb', 'TRUPP', 'aaaaaaaaaaaaaaaaaaaaaaaaaa')];
    const result = resolveAbschnittToEinheitIds(['aaaaaaaaaaaaaaaaaaaaaaaaaa'], einheiten);
    expect(result.einheitIds.length).toBeLessThanOrEqual(2);
    expect(result.einheitIds).toContain('aaaaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('(R5) Truncation @ MAX_EINHEIT_IDS: > 50 Einheiten → ersten 50 + truncated=true + droppedCount korrekt', () => {
    const abschnitt = makeEinheit('a'.repeat(26), 'ABSCHNITT');
    const kinder = Array.from({ length: 75 }, (_, i) => makeEinheit(`k${String(i).padStart(25, '0')}`, 'TRUPP', abschnitt.id));
    const result = resolveAbschnittToEinheitIds([abschnitt.id], [abschnitt, ...kinder]);
    expect(result.truncated).toBe(true);
    expect(result.einheitIds.length).toBe(MAX_EINHEIT_IDS);
    // 1 Abschnitt + 75 Kinder = 76 → 76 - 50 = 26 droppte Einheiten
    expect(result.droppedCount).toBe(26);
  });

  it('(R5b) ohne Truncation: droppedCount = 0', () => {
    const abschnitt = makeEinheit('a'.repeat(26), 'ABSCHNITT');
    const result = resolveAbschnittToEinheitIds([abschnitt.id], [abschnitt]);
    expect(result.truncated).toBe(false);
    expect(result.droppedCount).toBe(0);
  });

  it('(R6) Tiefen-Cap: nur bis Tiefe 3 expandiert (defense gegen tiefe Hierarchien)', () => {
    // ABSCHNITT > ZUG > GRUPPE > STAFFEL > TRUPP — Tiefe 4 vom Abschnitt.
    // Mit Tiefen-Cap 3 wird der TRUPP NICHT mehr eingesammelt.
    const a = makeEinheit('aaaaaaaaaaaaaaaaaaaaaaaaaa', 'ABSCHNITT');
    const z = makeEinheit('zzzzzzzzzzzzzzzzzzzzzzzzzz', 'ZUG', a.id);
    const g = makeEinheit('gggggggggggggggggggggggggg', 'GRUPPE', z.id);
    const s = makeEinheit('ssssssssssssssssssssssssss', 'STAFFEL', g.id);
    const t = makeEinheit('tttttttttttttttttttttttttt', 'TRUPP', s.id);
    const result = resolveAbschnittToEinheitIds([a.id], [a, z, g, s, t]);
    expect(result.einheitIds).toContain(a.id);
    expect(result.einheitIds).toContain(z.id);
    expect(result.einheitIds).toContain(g.id);
    expect(result.einheitIds).toContain(s.id);
    expect(result.einheitIds).not.toContain(t.id);
  });
});
