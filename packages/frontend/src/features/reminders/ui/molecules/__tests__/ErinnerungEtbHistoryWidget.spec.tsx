/**
 * Unit Tests für ErinnerungEtbHistoryWidget
 *
 * **Story 5.7:** Bidirektionale Verknüpfung - Erinnerung zu ETB Navigation
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Hoist the mock function so it's available before vi.mock runs
const mockUseErinnerungEtbHistory = vi.hoisted(() => vi.fn());

// Mock the api module before importing components
vi.mock('../../../api', () => ({
  useErinnerungEtbHistory: mockUseErinnerungEtbHistory,
}));

// Also mock the constants to avoid import chain issues
vi.mock('../../../constants', () => ({
  getEventConfig: (eventType: string) => {
    const configs: Record<string, { icon: () => null; bgColor: string; textColor: string; label: string }> = {
      ErinnerungErstellt: { icon: () => null, bgColor: 'bg-blue-100', textColor: 'text-blue-600', label: 'Erstellt' },
      ErinnerungAusgeloest: { icon: () => null, bgColor: 'bg-orange-100', textColor: 'text-orange-600', label: 'Ausgelöst' },
      ErinnerungAcknowledged: { icon: () => null, bgColor: 'bg-green-100', textColor: 'text-green-600', label: 'Bestätigt' },
      ErinnerungSnoozed: { icon: () => null, bgColor: 'bg-purple-100', textColor: 'text-purple-600', label: 'Verschoben' },
      ErinnerungEskaliert: { icon: () => null, bgColor: 'bg-red-100', textColor: 'text-red-600', label: 'Eskaliert' },
      ErinnerungErledigt: { icon: () => null, bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', label: 'Erledigt' },
      ErinnerungAssigned: { icon: () => null, bgColor: 'bg-indigo-100', textColor: 'text-indigo-600', label: 'Zugewiesen' },
    };
    return configs[eventType] ?? { icon: () => null, bgColor: 'bg-gray-100', textColor: 'text-gray-600', label: eventType };
  },
  EVENT_CONFIG: {},
}));

import { ErinnerungEtbHistoryWidget } from '../ErinnerungEtbHistoryWidget';

/**
 * Helper: Wrapper mit QueryClient
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/**
 * Factory für Test-Entries
 */
function createMockEntry(overrides: { id?: string; sequenceNumber?: number; text?: string; eventType?: string } = {}) {
  return {
    id: overrides.id ?? `entry-${Math.random().toString(36).slice(2)}`,
    sequenceNumber: overrides.sequenceNumber ?? 1,
    text: overrides.text ?? 'Test Eintrag',
    eventType: overrides.eventType ?? 'ErinnerungErstellt',
    timestamp: new Date().toISOString(),
    createdBy: { id: 'user-1', username: 'testuser' },
  };
}

describe('ErinnerungEtbHistoryWidget', () => {
  const defaultProps = {
    erinnerungId: 'erin-123',
    einsatzId: 'einsatz-456',
    onEntryClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Query-Objekt zurueckgeben damit Destructuring nicht fehlschlaegt
    mockUseErinnerungEtbHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
  });

  describe('Conditional Rendering (AC5)', () => {
    it('should not render when erinnerungId is null', () => {
      const { container } = render(<ErinnerungEtbHistoryWidget erinnerungId={null} einsatzId="einsatz-123" onEntryClick={vi.fn()} />, { wrapper: createWrapper() });

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockUseErinnerungEtbHistory.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('ETB-Verknüpfungen')).toBeInTheDocument();
      // Spinner sollte vorhanden sein (hat animate-spin Klasse)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when query fails', () => {
      mockUseErinnerungEtbHistory.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('Konnte nicht geladen werden.')).toBeInTheDocument();
    });
  });

  describe('Empty State (AC5)', () => {
    it('should show empty message when no entries', () => {
      mockUseErinnerungEtbHistory.mockReturnValue({
        data: { entries: [], totalCount: 0 },
        isLoading: false,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('Keine ETB-Einträge vorhanden.')).toBeInTheDocument();
    });
  });

  describe('Entry Display (AC3)', () => {
    it('should display entries with sequence number and text', () => {
      const entries = [createMockEntry({ sequenceNumber: 42, text: 'Erinnerung erstellt' })];

      mockUseErinnerungEtbHistory.mockReturnValue({
        data: { entries, totalCount: 1 },
        isLoading: false,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('#42')).toBeInTheDocument();
      expect(screen.getByText('Erinnerung erstellt')).toBeInTheDocument();
    });

    it('should display total count in header', () => {
      const entries = [createMockEntry(), createMockEntry()];

      mockUseErinnerungEtbHistory.mockReturnValue({
        data: { entries, totalCount: 2 },
        isLoading: false,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('2 Einträge')).toBeInTheDocument();
    });

    it('should show singular "Eintrag" for single entry', () => {
      mockUseErinnerungEtbHistory.mockReturnValue({
        data: { entries: [createMockEntry()], totalCount: 1 },
        isLoading: false,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('1 Eintrag')).toBeInTheDocument();
    });
  });

  describe('Event Types with Icons (AC3)', () => {
    it.each([
      ['ErinnerungErstellt', 'Erstellt'],
      ['ErinnerungAusgeloest', 'Ausgelöst'],
      ['ErinnerungAcknowledged', 'Bestätigt'],
      ['ErinnerungSnoozed', 'Verschoben'],
      ['ErinnerungEskaliert', 'Eskaliert'],
      ['ErinnerungErledigt', 'Erledigt'],
      ['ErinnerungAssigned', 'Zugewiesen'],
    ])('should display correct label for %s event', (eventType, expectedLabel) => {
      const entries = [createMockEntry({ eventType })];

      mockUseErinnerungEtbHistory.mockReturnValue({
        data: { entries, totalCount: 1 },
        isLoading: false,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });

    it('should use eventType as label for unknown types', () => {
      const entries = [createMockEntry({ eventType: 'UnknownEvent' })];

      mockUseErinnerungEtbHistory.mockReturnValue({
        data: { entries, totalCount: 1 },
        isLoading: false,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('UnknownEvent')).toBeInTheDocument();
    });
  });

  describe('Click Handling (AC3)', () => {
    it('should call onEntryClick with entry id when entry is clicked', async () => {
      const user = userEvent.setup();
      const onEntryClick = vi.fn();
      const entryId = 'entry-click-test';
      const entries = [createMockEntry({ id: entryId })];

      mockUseErinnerungEtbHistory.mockReturnValue({
        data: { entries, totalCount: 1 },
        isLoading: false,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} onEntryClick={onEntryClick} />, { wrapper: createWrapper() });

      const buttons = screen.getAllByRole('button');
      // Erster Button ist der Entry (nicht der Expand-Button)
      await user.click(buttons[0]);

      expect(onEntryClick).toHaveBeenCalledWith(entryId);
    });
  });

  describe('Collapsible Behavior', () => {
    it('should show only 3 entries initially when more than 3 exist', () => {
      const entries = [
        createMockEntry({ sequenceNumber: 1 }),
        createMockEntry({ sequenceNumber: 2 }),
        createMockEntry({ sequenceNumber: 3 }),
        createMockEntry({ sequenceNumber: 4 }),
        createMockEntry({ sequenceNumber: 5 }),
      ];

      mockUseErinnerungEtbHistory.mockReturnValue({
        data: { entries, totalCount: 5 },
        isLoading: false,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      // Nur die ersten 3 sollten sichtbar sein
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
      expect(screen.queryByText('#4')).not.toBeInTheDocument();
      expect(screen.queryByText('#5')).not.toBeInTheDocument();
    });

    it('should show "X weitere anzeigen" button when collapsed', () => {
      const entries = Array.from({ length: 5 }, (_, i) => createMockEntry({ sequenceNumber: i + 1 }));

      mockUseErinnerungEtbHistory.mockReturnValue({
        data: { entries, totalCount: 5 },
        isLoading: false,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('2 weitere anzeigen')).toBeInTheDocument();
    });

    it('should show all entries when expanded', async () => {
      const user = userEvent.setup();
      const entries = Array.from({ length: 5 }, (_, i) => createMockEntry({ sequenceNumber: i + 1 }));

      mockUseErinnerungEtbHistory.mockReturnValue({
        data: { entries, totalCount: 5 },
        isLoading: false,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      // Expand klicken
      await user.click(screen.getByText('2 weitere anzeigen'));

      // Alle sollten sichtbar sein
      expect(screen.getByText('#4')).toBeInTheDocument();
      expect(screen.getByText('#5')).toBeInTheDocument();
      expect(screen.getByText('Weniger anzeigen')).toBeInTheDocument();
    });

    it('should not show expand button when 3 or fewer entries', () => {
      const entries = [createMockEntry(), createMockEntry(), createMockEntry()];

      mockUseErinnerungEtbHistory.mockReturnValue({
        data: { entries, totalCount: 3 },
        isLoading: false,
        error: null,
      });

      render(<ErinnerungEtbHistoryWidget {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.queryByText(/weitere anzeigen/)).not.toBeInTheDocument();
      expect(screen.queryByText('Weniger anzeigen')).not.toBeInTheDocument();
    });
  });
});
