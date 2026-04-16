/**
 * Schema-Validation Tests für die Alarmierung-Route.
 */

import { render } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseSearch = vi.fn(() => ({ tab: 'liste' as 'liste' | 'timeline' }));
const mockNavigate = vi.fn();
const mockUseParams = vi.fn(() => ({ einsatzId: 'e1' }));

// `createFileRoute` in Tanstack Router liefert ein Route-Objekt zurück, auf dem
// die Route-Komponente `Route.useSearch()` aufruft. Der Mock muss das nachbilden,
// sonst wirft die Komponente beim Rendern.
const mockCreateFileRoute = vi.fn(() => (config: unknown) => ({
  ...(config as object),
  useSearch: mockUseSearch,
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return {
    ...actual,
    createFileRoute: mockCreateFileRoute,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

const alarmierungPageMock = vi.fn(() => null);

vi.mock('@/features/alarmierung/ui/pages/AlarmierungPage', () => ({
  AlarmierungPage: (props: unknown) => alarmierungPageMock(props),
}));

describe('Route /app/einsatz/$einsatzId/kommunikation/alarmierung', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearch.mockReturnValue({ tab: 'liste' });
    mockUseParams.mockReturnValue({ einsatzId: 'e1' });
  });

  it('parsed tab=liste als Default', async () => {
    const { Route } = await import('../alarmierung');
    const search = (Route as { validateSearch: (s: unknown) => { tab: string } }).validateSearch({});
    expect(search.tab).toBe('liste');
  });

  it('akzeptiert tab=timeline', async () => {
    const { Route } = await import('../alarmierung');
    const search = (Route as { validateSearch: (s: unknown) => { tab: string } }).validateSearch({ tab: 'timeline' });
    expect(search.tab).toBe('timeline');
  });

  it('fällt bei ungültigem Tab auf Default zurück', async () => {
    const { Route } = await import('../alarmierung');
    const search = (Route as { validateSearch: (s: unknown) => { tab: string } }).validateSearch({ tab: 'kanalplan' });
    expect(search.tab).toBe('liste');
  });

  describe('AlarmierungRouteComponent', () => {
    it('gibt einsatzId und tab an die AlarmierungPage weiter', async () => {
      mockUseParams.mockReturnValue({ einsatzId: 'einsatz-42' });
      mockUseSearch.mockReturnValue({ tab: 'timeline' });

      const { Route } = await import('../alarmierung');
      const Component = (Route as { component: () => JSX.Element }).component;

      render(createElement(Component));

      expect(alarmierungPageMock).toHaveBeenCalledTimes(1);
      const props = alarmierungPageMock.mock.calls[0][0] as { einsatzId: string; tab: string; onTabChange: (next: 'liste' | 'timeline') => void };
      expect(props.einsatzId).toBe('einsatz-42');
      expect(props.tab).toBe('timeline');
      expect(typeof props.onTabChange).toBe('function');
    });

    it('navigiert bei onTabChange zu neuem Tab', async () => {
      const { Route } = await import('../alarmierung');
      const Component = (Route as { component: () => JSX.Element }).component;

      render(createElement(Component));
      const props = alarmierungPageMock.mock.calls[0][0] as { onTabChange: (next: 'liste' | 'timeline') => void };

      props.onTabChange('timeline');

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({ search: { tab: 'timeline' } });
    });
  });
});
