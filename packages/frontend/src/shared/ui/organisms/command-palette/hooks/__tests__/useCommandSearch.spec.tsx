import { renderHook } from '@testing-library/react';
import { PiShieldWarning } from 'react-icons/pi';
import { describe, expect, it } from 'vitest';
import { useCommandSearch } from '../useCommandSearch';
import type { ModuleConfig } from '../../types';

const modules: ModuleConfig[] = [
  {
    id: 'eigenschutz-aktionen',
    name: 'Eigenschutz',
    color: 'red',
    icon: PiShieldWarning,
    subPages: [
      {
        id: 'new-gefaehrdung',
        name: 'Eigenschutz: Neue Gefährdungsbeurteilung',
        description: 'Beurteilung für eine Einheit anlegen',
        keywords: ['Gefaehrdung', 'Risiko', 'Schutzmaßnahmen'],
      },
      {
        id: 'archive-vorfall',
        name: 'Eigenschutz: Vorfall-Archiv öffnen',
        description: 'Vorfälle filtern und exportieren',
        keywords: ['Archiv', 'Unfallkasse'],
      },
    ],
  },
];

describe('useCommandSearch', () => {
  it('findet Commands über Umlaut- und ASCII-Schreibweisen', () => {
    const { result, rerender } = renderHook(({ search }) => useCommandSearch({ modules, search }), {
      initialProps: { search: 'Gefaehrdung' },
    });

    expect(result.current.filteredCommands.map((command) => command.name)).toEqual(['Eigenschutz: Neue Gefährdungsbeurteilung']);

    rerender({ search: 'Gefährdung' });

    expect(result.current.filteredCommands.map((command) => command.name)).toEqual(['Eigenschutz: Neue Gefährdungsbeurteilung']);
  });

  it('durchsucht Name, Modul, Beschreibung und Keywords normalisiert', () => {
    const { result, rerender } = renderHook(({ search }) => useCommandSearch({ modules, search }), {
      initialProps: { search: 'Schutzmassnahmen' },
    });

    expect(result.current.filteredCommands.map((command) => command.id)).toEqual(['eigenschutz-aktionen-new-gefaehrdung']);

    rerender({ search: 'unfallkasse' });

    expect(result.current.filteredCommands.map((command) => command.id)).toEqual(['eigenschutz-aktionen-archive-vorfall']);
  });
});
