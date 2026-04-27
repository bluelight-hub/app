import { screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';

/**
 * Route-Tests für `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln`
 * (Story 2.6, Task 9.4). `createFileRoute` wird gemockt, damit die
 * Route-Komponente isoliert rendert.
 */

const { captured, mockUseParams } = vi.hoisted(() => ({
  captured: { component: null as (() => React.JSX.Element) | null },
  mockUseParams: vi.fn(() => ({ einsatzId: 'einsatz-1' })),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: (_path: string) => (options: { component: () => React.JSX.Element }) => {
      captured.component = options.component;
      return {
        useParams: mockUseParams,
        options,
      };
    },
  };
});

vi.mock('@/features/eigenschutz/ui/pages/SicherheitsregelnPage', () => ({
  SicherheitsregelnPage: ({ einsatzId }: { einsatzId: string }) => <div data-testid="sicherheitsregeln-page">Sicherheitsregeln:{einsatzId}</div>,
}));

import '../eigenschutz/sicherheitsregeln';

function renderRoute() {
  if (!captured.component) {
    throw new Error('Route-Komponente wurde nicht via createFileRoute-Mock erfasst.');
  }
  const Component = captured.component;
  return renderWithProviders(<Component />);
}

describe('Sicherheitsregeln Route (Story 2.6)', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ einsatzId: 'einsatz-1' });
  });

  it('rendert die SicherheitsregelnPage mit einsatzId aus den Params', () => {
    renderRoute();
    expect(screen.getByTestId('sicherheitsregeln-page')).toHaveTextContent('Sicherheitsregeln:einsatz-1');
  });
});
