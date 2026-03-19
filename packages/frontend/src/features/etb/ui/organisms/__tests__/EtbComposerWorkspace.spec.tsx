import { act } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EtbComposerWorkspace } from '../EtbComposerWorkspace';

// Steuerbare Mock-State-Variablen
const defaultData = {
  pages: [
    {
      data: {
        id: 'etb-1',
        status: 'ACTIVE',
        eintraege: [
          {
            id: 'entry-1',
            text: 'Testmeldung 1',
            kategorie: 'LAGE',
            absender: 'EL',
            empfaenger: 'Leitstelle',
            sequenceNumber: 1,
            createdAt: '2026-03-19T10:00:00Z',
            timestamp: '2026-03-19T10:00:00Z',
          },
        ],
      },
      pagination: { total: 1, limit: 30, offset: 0 },
    },
  ],
  pageParams: [undefined],
};

const mockState = {
  data: defaultData as unknown,
  isLoading: false,
  error: null as Error | null,
};

let mockDelayedLoading = false;

// Mock hooks — absolute Pfade
vi.mock('@/features/einsatz/hooks/use-einsatz-details', () => ({
  useEinsatzDetails: () => ({
    einsatz: { id: 'einsatz-1', name: 'Hochwasser Musterstadt', status: 'AKTIV' },
    etb: { id: 'etb-1', status: 'ACTIVE' },
    lagekarte: null,
    isLoading: false,
    isFetching: false,
    error: null,
    data: undefined,
  }),
}));

vi.mock('@/features/etb/api', () => ({
  useEtbInfinite: () => ({
    data: mockState.data,
    isLoading: mockState.isLoading,
    error: mockState.error,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: vi.fn(),
    isRefetching: false,
  }),
}));

vi.mock('@/features/etb/hooks/useDelayedLoading', () => ({
  useDelayedLoading: () => mockDelayedLoading,
}));

// Mock Kindkomponenten — absolute Pfade
let capturedOnSuccess: (() => void) | undefined;

vi.mock('@/features/etb/ui/organisms/EtbEntryForm', () => ({
  EtbEntryForm: (props: { autoFocus?: boolean; onSuccess?: () => void; afterSaveFocusRef?: { current: HTMLDivElement | null }; 'aria-labelledby'?: string }) => {
    capturedOnSuccess = props.onSuccess;
    return (
      <div data-testid="etb-entry-form" data-auto-focus={props.autoFocus} aria-labelledby={props['aria-labelledby']}>
        <div
          ref={(el: HTMLDivElement | null) => {
            if (props.afterSaveFocusRef) props.afterSaveFocusRef.current = el;
          }}
        >
          <input data-testid="kategorie-input" />
        </div>
        EtbEntryForm Mock
      </div>
    );
  },
}));

vi.mock('@/features/etb/ui/organisms/EtbEntryList', () => ({
  EtbEntryList: () => <div data-testid="etb-entry-list">EtbEntryList Mock</div>,
}));

vi.mock('@/features/etb/ui/molecules/EtbLockButton', () => ({
  EtbLockButton: () => <button type="button">Lock</button>,
}));

vi.mock('@/features/etb/ui/molecules/EtbStatusBadge', () => ({
  EtbStatusBadge: ({ status }: { status: string }) => <span data-testid="etb-status-badge">{status}</span>,
}));

vi.mock('@/features/etb/ui/organisms/EditEtbEntryModal', () => ({
  EditEtbEntryModal: () => null,
}));

vi.mock('@/features/etb/ui/organisms/components/EtbSnapshotHistoryModal', () => ({
  EtbSnapshotHistoryModal: () => null,
}));

vi.mock('@/shared/ui/atoms/ErrorState', () => ({
  ErrorState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="error-state">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));

describe('EtbComposerWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.data = defaultData;
    mockState.isLoading = false;
    mockState.error = null;
    mockDelayedLoading = false;
    capturedOnSuccess = undefined;
  });

  // === AC 1: Aktiver Einsatzkontext und Eingabefläche sichtbar ===

  it('zeigt den Einsatz-Kontext im Header (Einsatzname)', () => {
    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(screen.getByText('Hochwasser Musterstadt')).toBeInTheDocument();
  });

  it('zeigt den Breadcrumb-Kontext "Führung → ETB"', () => {
    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(screen.getByText('Führung')).toBeInTheDocument();
    expect(screen.getByText('ETB')).toBeInTheDocument();
  });

  it('zeigt Titel "Einsatztagebuch" und ETB-Status-Badge', () => {
    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(screen.getByText('Einsatztagebuch')).toBeInTheDocument();
    expect(screen.getByTestId('etb-status-badge')).toHaveTextContent('ACTIVE');
  });

  it('rendert EtbEntryForm und EtbEntryList', () => {
    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(screen.getByTestId('etb-entry-form')).toBeInTheDocument();
    expect(screen.getByTestId('etb-entry-list')).toBeInTheDocument();
  });

  it('übergibt autoFocus an EtbEntryForm', () => {
    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(screen.getByTestId('etb-entry-form')).toHaveAttribute('data-auto-focus', 'true');
  });

  // === AC 2: Eingabe dem aktiven Einsatz zugeordnet ===

  it('zeigt "Neuer Eintrag"-Überschrift für aktives ETB', () => {
    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(screen.getByText('Neuer Eintrag')).toBeInTheDocument();
  });

  it('zeigt Gesperrt-Hinweis bei LOCKED ETB', () => {
    mockState.data = {
      pages: [{ data: { id: 'etb-1', status: 'LOCKED', eintraege: [] }, pagination: { total: 0, limit: 30, offset: 0 } }],
      pageParams: [undefined],
    };

    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Das ETB ist gesperrt');
  });

  // === AC 3: Semantischer Ladezustand ===

  it('zeigt Skeleton bei verzögertem Laden', () => {
    mockState.data = undefined;
    mockState.isLoading = true;
    mockDelayedLoading = true;

    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('ETB wird geladen — bitte warten')).toBeInTheDocument();
  });

  it('zeigt nichts bei schnellem Laden (unter 300ms)', () => {
    mockState.data = undefined;
    mockState.isLoading = true;
    mockDelayedLoading = false;

    const { container } = renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(container.innerHTML).toBe('');
  });

  // === AC 4: Accessibility ===

  it('hat aria-labelledby auf dem Formular', () => {
    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(screen.getByTestId('etb-entry-form')).toHaveAttribute('aria-labelledby', 'composer-heading');
  });

  it('hat eine Live-Region für Status-Ankündigungen', () => {
    const { container } = renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('hat aria-label auf dem Breadcrumb-Nav', () => {
    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(screen.getByLabelText('ETB-Kontext-Navigation')).toBeInTheDocument();
  });

  it('hat focus-visible:shadow-focus-ring auf den Header-Buttons', () => {
    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    const aktualisierenBtn = screen.getByTitle('Aktualisieren');
    const historieBtn = screen.getByTitle('Versionshistorie anzeigen');
    expect(aktualisierenBtn.className).toContain('focus-visible:shadow-focus-ring');
    expect(historieBtn.className).toContain('focus-visible:shadow-focus-ring');
  });

  // === Fokus-Management nach Speichern (AC 1, 4) ===

  it('fokussiert Kategorie-Feld nach erfolgreichem Speichern', () => {
    vi.useFakeTimers();
    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);

    act(() => {
      capturedOnSuccess?.();
    });

    // rAF ausführen (jsdom implementiert rAF als setTimeout(cb, 0))
    act(() => {
      vi.advanceTimersByTime(16);
    });

    expect(screen.getByTestId('kategorie-input')).toHaveFocus();
    vi.useRealTimers();
  });

  // === Live-Region Status (AC 4) ===

  it('zeigt Speicher-Status in der Live-Region und räumt ihn nach 3s auf', () => {
    vi.useFakeTimers();
    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);

    act(() => {
      capturedOnSuccess?.();
    });

    // Status-Nachricht erscheint sofort
    expect(screen.getByText('Eintrag erfolgreich gespeichert')).toBeInTheDocument();

    // Nach 3s wird die Nachricht aufgeräumt
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Eintrag erfolgreich gespeichert')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  // === Fehlerfall ===

  it('zeigt ErrorState bei API-Fehler', () => {
    mockState.data = undefined;
    mockState.isLoading = false;
    mockState.error = new Error('API Error');

    renderWithProviders(<EtbComposerWorkspace einsatzId="einsatz-1" />);
    expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument();
  });
});
