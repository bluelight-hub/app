import { screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';

/**
 * Route-Tests für `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln`
 * (Story 2.6, Task 9.4). `createFileRoute` wird gemockt, damit die
 * Route-Komponente isoliert rendert.
 */

const { captured, mockUseParams, mockUseSearch, mockNavigate } = vi.hoisted(() => ({
  captured: { route: null as { component: () => React.JSX.Element; validateSearch?: (search: Record<string, unknown>) => unknown } | null },
  mockUseParams: vi.fn(() => ({ einsatzId: 'einsatz-1' })),
  mockUseSearch: vi.fn(() => ({})),
  mockNavigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: (_path: string) => (options: { component: () => React.JSX.Element; validateSearch?: (search: Record<string, unknown>) => unknown }) => {
      captured.route = options;
      return {
        useParams: mockUseParams,
        useSearch: mockUseSearch,
        options,
      };
    },
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/features/eigenschutz/ui/pages/SicherheitsregelnPage', () => ({
  SicherheitsregelnPage: ({ einsatzId, initialAction }: { einsatzId: string; initialAction?: string }) => (
    <div data-testid="sicherheitsregeln-page">
      Sicherheitsregeln:{einsatzId}:{initialAction ?? 'no-action'}
    </div>
  ),
}));

import '../eigenschutz/sicherheitsregeln';

function renderRoute() {
  if (!captured.route?.component) {
    throw new Error('Route-Komponente wurde nicht via createFileRoute-Mock erfasst.');
  }
  const Component = captured.route.component;
  return renderWithProviders(<Component />);
}

describe('Sicherheitsregeln Route (Story 2.6)', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ einsatzId: 'einsatz-1' });
    mockUseSearch.mockReturnValue({});
    mockNavigate.mockReset();
  });

  it('rendert die SicherheitsregelnPage mit einsatzId aus den Params', () => {
    renderRoute();
    expect(screen.getByTestId('sicherheitsregeln-page')).toHaveTextContent('Sicherheitsregeln:einsatz-1:no-action');
  });

  it('validiert und propagiert den neuen Action-Param defensiv', () => {
    expect(captured.route?.validateSearch?.({ action: 'new-sicherheitsregel' })).toEqual({ action: 'new-sicherheitsregel' });
    expect(captured.route?.validateSearch?.({ action: 'bogus' })).toEqual({ action: undefined });

    mockUseSearch.mockReturnValueOnce({ action: 'new-sicherheitsregel' });
    renderRoute();

    expect(screen.getByTestId('sicherheitsregeln-page')).toHaveTextContent('Sicherheitsregeln:einsatz-1:new-sicherheitsregel');
  });
});
