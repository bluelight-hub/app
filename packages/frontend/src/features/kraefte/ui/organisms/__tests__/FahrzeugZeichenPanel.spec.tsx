/**
 * Tests für FahrzeugZeichenPanel
 *
 * Prüft Rendering-Zustände: Loading, Empty State, Zeichen vorhanden, nicht platziert.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FahrzeugZeichenPanel } from '../FahrzeugZeichenPanel';

// ============================================
// Mocks
// ============================================

const { mockZeichenState } = vi.hoisted(() => ({
  mockZeichenState: {
    data: undefined as any,
    isLoading: false,
  },
}));

vi.mock('@/features/kraefte/api/use-fahrzeug-zeichen', () => ({
  useFahrzeugZeichen: () => mockZeichenState,
}));

vi.mock('@/features/kraefte/api/use-update-fahrzeug-zeichen', () => ({
  useUpdateFahrzeugZeichen: () => ({ mutate: vi.fn(), isPending: false }),
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
  fahrzeugId: 'fzg-1',
  fahrzeugName: 'KTW 1',
};

function renderPanel(overrides = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FahrzeugZeichenPanel {...defaultProps} {...overrides} />
    </QueryClientProvider>,
  );
}

describe('FahrzeugZeichenPanel', () => {
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
      label: 'KTW-Zeichen',
      lat: 50.1,
      lng: 10.5,
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-landgebunden' },
    };
    mockZeichenState.isLoading = false;

    renderPanel();
    expect(screen.getByTestId('zeichen-preview')).toHaveTextContent('kraftfahrzeug-landgebunden');
    expect(screen.getByText('KTW-Zeichen')).toBeInTheDocument();
    expect(screen.getByText('Aktuelles Zeichen')).toBeInTheDocument();
  });

  it('zeigt Warnung wenn Zeichen nicht platziert ist', () => {
    mockZeichenState.data = {
      id: 'z-1',
      label: 'Unplatziert',
      lat: null,
      lng: null,
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-landgebunden' },
    };
    mockZeichenState.isLoading = false;

    renderPanel();
    expect(screen.getByText('Noch nicht auf Karte platziert')).toBeInTheDocument();
  });

  it('zeigt Fahrzeug-spezifische Texte', () => {
    mockZeichenState.data = undefined;
    mockZeichenState.isLoading = false;

    renderPanel();
    expect(screen.getByText(/Erstelle unten ein neues Zeichen für dieses Fahrzeug/)).toBeInTheDocument();
  });

  it('übergibt fahrzeugName als initialLabel an den Editor', () => {
    mockZeichenState.data = undefined;
    mockZeichenState.isLoading = false;

    renderPanel();
    expect(screen.getByTestId('zeichen-editor')).toHaveTextContent('Editor: KTW 1');
  });
});
