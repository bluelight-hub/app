import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_FILTER, funkprotokollFilterStore, getFilterForEinsatz, resetFilterForEinsatz, setFilterForEinsatz } from '../stores/funkprotokoll-filter.store';

describe('funkprotokoll-filter.store', () => {
  beforeEach(() => {
    funkprotokollFilterStore.setState(() => ({ byEinsatz: {} }));
  });

  it('liefert Default-Filter für unbekannte Einsatz-ID', () => {
    expect(getFilterForEinsatz('unknown')).toEqual(DEFAULT_FILTER);
  });

  it('speichert Filter pro Einsatz-ID isoliert', () => {
    setFilterForEinsatz('e1', { kanalIds: ['k1'], prioritaeten: ['notfall'], dichteMode: 'kompakt' });
    expect(getFilterForEinsatz('e1').kanalIds).toEqual(['k1']);
    expect(getFilterForEinsatz('e1').prioritaeten).toEqual(['notfall']);
    expect(getFilterForEinsatz('e1').dichteMode).toBe('kompakt');
    expect(getFilterForEinsatz('e2')).toEqual(DEFAULT_FILTER);
  });

  it('merged partielle Patches ohne bestehende Felder zu verlieren', () => {
    setFilterForEinsatz('e1', { kanalIds: ['k1'], dichteMode: 'kompakt' });
    setFilterForEinsatz('e1', { prioritaeten: ['prioritaet'] });

    const filter = getFilterForEinsatz('e1');
    expect(filter.kanalIds).toEqual(['k1']);
    expect(filter.prioritaeten).toEqual(['prioritaet']);
    expect(filter.dichteMode).toBe('kompakt');
  });

  it('resettet Filter auf Default und entfernt Einsatz-Key', () => {
    setFilterForEinsatz('e1', { kanalIds: ['k1'] });
    resetFilterForEinsatz('e1');

    expect(getFilterForEinsatz('e1')).toEqual(DEFAULT_FILTER);
    expect(funkprotokollFilterStore.state.byEinsatz).not.toHaveProperty('e1');
  });
});
