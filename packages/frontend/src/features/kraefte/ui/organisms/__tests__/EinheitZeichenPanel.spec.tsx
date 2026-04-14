/**
 * Tests für EinheitZeichenPanel
 *
 * Prüft Rendering-Zustände: Loading, Empty State, Zeichen vorhanden, nicht platziert.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EinheitZeichenPanel } from '../EinheitZeichenPanel';

// ============================================
// Mocks
// ============================================

const { mockZeichenState } = vi.hoisted(() => ({
  mockZeichenState: {
    data: undefined as any,
    isLoading: false,
  },
}));

vi.mock('@/features/kraefte/api/use-einheit-zeichen', () => ({
  useEinheitZeichen: () => mockZeichenState,
}));

vi.mock('@/features/kraefte/api/use-update-einheit-zeichen', () => ({
  useUpdateEinheitZeichen: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/features/taktische-zeichen/api/use-create-zeichen', () => ({
  useCreateZeichen: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/features/taktische-zeichen/rendering/ZeichenPreview', () => ({
  ZeichenPreview: ({ definition }: any) => <div data-testid="zeichen-preview">{definition?.grundzeichen}</div>,
}));

vi.mock('@/features/taktische-zeichen/ui/molecules/ZeichenEditor', () => ({
  ZeichenEditor: ({ initialLabel }: any) => <div data-testid="zeichen-editor">Editor: {initialLabel}</div>,
}));

vi.mock('@/shared/ui/atoms/LoadingState', () => ({
  LoadingState: ({ message }: any) => <div data-testid="loading">{message}</div>,
}));

vi.mock('@/shared/ui/molecules/dialog.molecule', () => ({
  Dialog: {
    SlideIn: ({ isOpen, children, title }: any) =>
      isOpen ? (
        <div data-testid="slide-in" aria-label={title}>
          {children}
        </div>
      ) : null,
  },
}));

// ============================================
// Tests
// ============================================

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  einsatzId: 'einsatz-1',
  einheitId: 'einheit-1',
  einheitName: 'Gruppe 1',
};

function renderPanel(overrides = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EinheitZeichenPanel {...defaultProps} {...overrides} />
    </QueryClientProvider>,
  );
}

describe('EinheitZeichenPanel', () => {
  it('rendert nicht wenn isOpen=false', () => {
    mockZeichenState.data = undefined;
    mockZeichenState.isLoading = false;

    renderPanel({ isOpen: false });
    expect(screen.queryByTestId('slide-in')).not.toBeInTheDocument();
  });

  it('zeigt Loading-State', () => {
    mockZeichenState.data = undefined;
    mockZeichenState.isLoading = true;

    renderPanel();
    expect(screen.getByTestId('loading')).toHaveTextContent('Lade Zeichendaten...');
  });

  it('zeigt Empty State wenn kein Zeichen zugewiesen', () => {
    mockZeichenState.data = undefined;
    mockZeichenState.isLoading = false;

    renderPanel();
    expect(screen.getByText('Noch kein taktisches Zeichen zugewiesen')).toBeInTheDocument();
    expect(screen.getByText('Neues Zeichen erstellen')).toBeInTheDocument();
  });

  it('zeigt Vorschau wenn Zeichen existiert', () => {
    mockZeichenState.data = {
      id: 'z-1',
      label: 'Test-Zeichen',
      lat: 50.1,
      lng: 10.5,
      zeichenDefinition: { grundzeichen: 'taktische-formation' },
    };
    mockZeichenState.isLoading = false;

    renderPanel();
    expect(screen.getByTestId('zeichen-preview')).toHaveTextContent('taktische-formation');
    expect(screen.getByText('Test-Zeichen')).toBeInTheDocument();
    expect(screen.getByText('Aktuelles Zeichen')).toBeInTheDocument();
    expect(screen.getByText('Zeichen bearbeiten')).toBeInTheDocument();
  });

  it('zeigt Warnung wenn Zeichen nicht platziert ist', () => {
    mockZeichenState.data = {
      id: 'z-1',
      label: 'Unplatziert',
      lat: null,
      lng: null,
      zeichenDefinition: { grundzeichen: 'taktische-formation' },
    };
    mockZeichenState.isLoading = false;

    renderPanel();
    expect(screen.getByText('Noch nicht auf Karte platziert')).toBeInTheDocument();
  });

  it('übergibt einheitName als initialLabel an den Editor', () => {
    mockZeichenState.data = undefined;
    mockZeichenState.isLoading = false;

    renderPanel();
    expect(screen.getByTestId('zeichen-editor')).toHaveTextContent('Editor: Gruppe 1');
  });
});
