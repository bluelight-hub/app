/**
 * Route-Spec für `/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen`
 * + `/gefaehrdungen/$id` (Story 2.1 Task 8).
 *
 * Die Spec bedient drei Routen:
 * - `gefaehrdungen.tsx` ist Layout (rendert nur `<Outlet />`).
 * - `gefaehrdungen/index.tsx` ist die List-/Create-Route (rendert
 *   `GefaehrdungenPage`).
 * - `gefaehrdungen/$id.tsx` ist der AC3-Detail-Stub (rendert
 *   `EmptyState` mit Rück-Navigation).
 *
 * Der `createFileRoute`-Mock akzeptiert sowohl die Factory- als auch die
 * Options-Form der TanStack-Router-API; gesammelte Komponenten werden pro
 * Import ins `captured`-Array gelegt.
 */

import { screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';

const { captured, mockUseParams, mockUseSearch, mockNavigate } = vi.hoisted(() => ({
  captured: { routes: [] as Array<{ component: () => React.JSX.Element; validateSearch?: (search: Record<string, unknown>) => unknown }> },
  mockUseParams: vi.fn(() => ({ einsatzId: 'einsatz-1', id: 'beurteilung-7' })),
  mockUseSearch: vi.fn(() => ({})),
  mockNavigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  type RouteOptions = { component: () => React.JSX.Element };
  type RouteArg = RouteOptions | (() => RouteOptions);
  return {
    ...actual,
    createFileRoute: (_path: string) => (arg: RouteArg) => {
      const options = typeof arg === 'function' ? arg() : arg;
      captured.routes.push(options);
      return {
        useParams: mockUseParams,
        useSearch: mockUseSearch,
        options,
      };
    },
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/features/eigenschutz', () => ({
  GefaehrdungenPage: ({ einsatzId, initialAction }: { einsatzId: string; initialAction?: string }) => (
    <div data-testid="gefaehrdungen-page">
      GefaehrdungenPage:{einsatzId}:{initialAction ?? 'no-action'}
    </div>
  ),
  GefaehrdungenDetailPage: ({ einsatzId, id }: { einsatzId: string; id: string }) => (
    <div data-testid="gefaehrdungen-detail-page">
      GefaehrdungenDetailPage:{einsatzId}:{id}
    </div>
  ),
}));

// Route-Imports müssen NACH den vi.mock-Aufrufen stehen.
import '../eigenschutz/gefaehrdungen/index';
import '../eigenschutz/gefaehrdungen/$id';

function lastComponent(): () => React.JSX.Element {
  const route = captured.routes.at(-1);
  if (!route?.component) {
    throw new Error('Keine Route-Komponente erfasst — Reihenfolge der Imports prüfen.');
  }
  return route.component;
}

describe('Gefährdungen-Routen (Story 2.1)', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ einsatzId: 'einsatz-1', id: 'beurteilung-7' });
    mockUseSearch.mockReturnValue({});
    mockNavigate.mockReset();
  });

  it('index.tsx rendert die GefaehrdungenPage mit der einsatzId aus den Params', () => {
    // Der Import-Reihenfolge folgend ist `index.tsx` der vorletzte Eintrag.
    const IndexComponent = captured.routes[0]?.component;
    renderWithProviders(<IndexComponent />);

    expect(screen.getByTestId('gefaehrdungen-page')).toHaveTextContent('GefaehrdungenPage:einsatz-1:no-action');
  });

  it('index.tsx propagiert eine andere einsatzId, wenn Params sich ändern', () => {
    mockUseParams.mockReturnValueOnce({ einsatzId: 'einsatz-xyz', id: 'beurteilung-7' });
    const IndexComponent = captured.routes[0]?.component;
    renderWithProviders(<IndexComponent />);

    expect(screen.getByTestId('gefaehrdungen-page')).toHaveTextContent('GefaehrdungenPage:einsatz-xyz:no-action');
  });

  it('index.tsx validiert und propagiert den neuen Action-Param defensiv', () => {
    const indexRoute = captured.routes[0];
    expect(indexRoute?.validateSearch?.({ action: 'new-gefaehrdung' })).toEqual({ action: 'new-gefaehrdung' });
    expect(indexRoute?.validateSearch?.({ action: 'bogus' })).toEqual({ action: undefined });

    mockUseSearch.mockReturnValueOnce({ action: 'new-gefaehrdung' });
    const IndexComponent = indexRoute?.component;
    renderWithProviders(<IndexComponent />);

    expect(screen.getByTestId('gefaehrdungen-page')).toHaveTextContent('GefaehrdungenPage:einsatz-1:new-gefaehrdung');
  });

  it('$id.tsx rendert die GefaehrdungenDetailPage mit einsatzId und id (Story 2.2)', () => {
    const DetailComponent = lastComponent();
    renderWithProviders(<DetailComponent />);

    expect(screen.getByTestId('gefaehrdungen-detail-page')).toHaveTextContent('GefaehrdungenDetailPage:einsatz-1:beurteilung-7');
  });
});
