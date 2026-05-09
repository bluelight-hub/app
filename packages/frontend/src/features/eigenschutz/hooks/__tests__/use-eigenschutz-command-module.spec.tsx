import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEigenschutzCommandModule } from '../use-eigenschutz-command-module';

const navigateSpy = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
}));

vi.mock('../use-aktive-einsatz-einheit', () => ({
  useAktiveEinsatzEinheit: () => ({
    einheitId: 'einheit-1',
    einheitName: 'RTW 1',
    einheiten: [],
    setAktiveEinheit: vi.fn(),
    isLoading: false,
  }),
}));

describe('useEigenschutzCommandModule', () => {
  it('liefert die acht Eigenschutz-Befehle in einer eigenen Gruppe', () => {
    const { result } = renderHook(() => useEigenschutzCommandModule({ einsatzId: 'einsatz-1' }));

    expect(result.current.name).toBe('Eigenschutz');
    expect(result.current.subPages.map((command) => command.name)).toEqual([
      'Eigenschutz: Neue Gefährdungsbeurteilung',
      'Eigenschutz: Neuer Vorfall',
      'Eigenschutz: PSA-Profil ändern',
      'Eigenschutz: Sicherheitsregel erstellen',
      'Eigenschutz: Sicherungsposten anlegen',
      'Eigenschutz: Dashboard öffnen',
      'Eigenschutz: Konflikte auflösen',
      'Eigenschutz: Vorfall-Archiv öffnen',
    ]);
  });

  it('navigiert Drawer-Aktionen mit kleinem Action-Search-Param', () => {
    navigateSpy.mockReset();
    const { result } = renderHook(() => useEigenschutzCommandModule({ einsatzId: 'einsatz-1' }));

    result.current.subPages.find((command) => command.id === 'new-vorfall')?.action?.();

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle',
      params: { einsatzId: 'einsatz-1' },
      search: expect.any(Function),
    });
    expect((navigateSpy.mock.calls[0]?.[0].search as (prev: Record<string, unknown>) => Record<string, unknown>)({ filter: 'offen' })).toEqual({
      filter: 'offen',
      action: 'new-vorfall',
    });
  });

  it('markiert alle Befehle disabled, wenn der Workspace die Sicherheitsfläche sperrt', () => {
    const { result } = renderHook(() => useEigenschutzCommandModule({ einsatzId: 'einsatz-1', disabledReason: 'Keine Berechtigung' }));

    expect(result.current.subPages).toHaveLength(8);
    expect(result.current.subPages.every((command) => command.disabled)).toBe(true);
    expect(result.current.subPages.every((command) => command.disabledReason === 'Keine Berechtigung')).toBe(true);
  });

  it('sperrt nur den Konflikt-Befehl, wenn die Rolle keine Konfliktauflösung erlaubt', () => {
    const { result } = renderHook(() =>
      useEigenschutzCommandModule({
        einsatzId: 'einsatz-1',
        syncConflictsDisabledReason: 'Nur Befehlsgeber dürfen Konflikte auflösen.',
      }),
    );

    const syncCommand = result.current.subPages.find((command) => command.id === 'sync-konflikte');
    const dashboardCommand = result.current.subPages.find((command) => command.id === 'dashboard');

    expect(syncCommand).toMatchObject({
      disabled: true,
      disabledReason: 'Nur Befehlsgeber dürfen Konflikte auflösen.',
    });
    expect(dashboardCommand?.disabled).toBe(false);
  });
});
