import { beforeEach, describe, expect, it } from 'vitest';
import { replaceFilterState, resetFilter, selectFilterCount, selectFilterIsActive, setAbschnittIds, setUnfallkasseRelevant, setZeitraum, vorfallFilterStore } from '../vorfall-filter.store';

describe('vorfallFilterStore (Story 5.3 AC5)', () => {
  beforeEach(() => {
    resetFilter();
  });

  it('(S1) initial-State: alle Felder leer/undefined, Filter NICHT aktiv', () => {
    const state = vorfallFilterStore.state;
    expect(state.abschnittIds).toEqual([]);
    expect(state.vorfallZeitVon).toBeUndefined();
    expect(state.vorfallZeitBis).toBeUndefined();
    expect(state.unfallkasseRelevant).toBeUndefined();
    expect(selectFilterIsActive(state)).toBe(false);
    expect(selectFilterCount(state)).toBe(0);
  });

  it('(S2) setAbschnittIds + dedup', () => {
    setAbschnittIds(['a', 'b', 'a']);
    expect(vorfallFilterStore.state.abschnittIds).toEqual(['a', 'b']);
    expect(selectFilterIsActive(vorfallFilterStore.state)).toBe(true);
  });

  it('(S3) setZeitraum + setUnfallkasseRelevant', () => {
    setZeitraum('2026-05-01', '2026-05-08');
    setUnfallkasseRelevant(true);

    const state = vorfallFilterStore.state;
    expect(state.vorfallZeitVon).toBe('2026-05-01');
    expect(state.vorfallZeitBis).toBe('2026-05-08');
    expect(state.unfallkasseRelevant).toBe(true);
    expect(selectFilterCount(state)).toBe(2); // Zeitraum + UK
  });

  it('(S4) resetFilter setzt alle Felder zurück', () => {
    setAbschnittIds(['a']);
    setZeitraum('2026-05-01', undefined);
    setUnfallkasseRelevant(false);

    resetFilter();

    expect(vorfallFilterStore.state.abschnittIds).toEqual([]);
    expect(vorfallFilterStore.state.vorfallZeitVon).toBeUndefined();
    expect(vorfallFilterStore.state.vorfallZeitBis).toBeUndefined();
    expect(vorfallFilterStore.state.unfallkasseRelevant).toBeUndefined();
    expect(selectFilterIsActive(vorfallFilterStore.state)).toBe(false);
  });

  it('(S5) replaceFilterState ersetzt atomar', () => {
    setAbschnittIds(['old']);
    replaceFilterState({ abschnittIds: ['new1', 'new2'], vorfallZeitVon: '2026-05-01', vorfallZeitBis: undefined, unfallkasseRelevant: false, status: 'OFFEN' });

    const state = vorfallFilterStore.state;
    expect(state.abschnittIds).toEqual(['new1', 'new2']);
    expect(state.vorfallZeitVon).toBe('2026-05-01');
    expect(state.vorfallZeitBis).toBeUndefined();
    expect(state.unfallkasseRelevant).toBe(false);
  });

  it('(S6) selectFilterCount: pro Filter-Gruppe maximal +1 (Zeitraum zählt einmal, auch wenn nur Von gesetzt ist)', () => {
    setAbschnittIds(['a']);
    expect(selectFilterCount(vorfallFilterStore.state)).toBe(1);

    setZeitraum('2026-05-01', undefined);
    expect(selectFilterCount(vorfallFilterStore.state)).toBe(2);

    setUnfallkasseRelevant(true);
    expect(selectFilterCount(vorfallFilterStore.state)).toBe(3);
  });
});
