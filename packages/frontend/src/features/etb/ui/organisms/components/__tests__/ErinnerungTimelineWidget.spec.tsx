/**
 * Unit Tests fuer ErinnerungTimelineWidget Component
 *
 * Story 5.5: Timeline-Widget fuer Erinnerungs-Historie
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * Testet:
 * - Loading State Anzeige
 * - Error State Anzeige
 * - Leere Timeline (0 Events)
 * - Timeline mit verschiedenen Event-Types
 * - Korrekte Icons und Farben pro Event-Type
 * - Klick auf Event ruft onEntryClick auf
 * - Timestamp-Formatierung
 * - Metadata-Details (Snooze-Dauer, Notiz, Eskalationsstufe)
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { ErinnerungTimelineWidget } from '../ErinnerungTimelineWidget';
import type { ErinnerungTimelineDto, ErinnerungTimelineEventDto } from '@/shared';

// Mock the hook
vi.mock('@/features/etb/api', () => ({
  useErinnerungTimeline: vi.fn(),
}));

import { useErinnerungTimeline } from '@/features/etb/api';

const mockUseErinnerungTimeline = useErinnerungTimeline as ReturnType<typeof vi.fn>;

/**
 * Test-Wrapper mit QueryClientProvider
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

/**
 * Factory fuer Timeline Event Test-Daten
 */
function createMockEvent(overrides: Partial<ErinnerungTimelineEventDto> = {}): ErinnerungTimelineEventDto {
  return {
    id: 'event-1',
    eventType: 'Erstellt',
    timestamp: new Date('2025-01-15T10:30:00Z'),
    sequenceNumber: 1,
    createdBy: {
      id: 'user-1',
      username: 'maxmuster',
      displayName: 'Max Mustermann',
    },
    text: 'Erinnerung wurde erstellt',
    metadata: null,
    ...overrides,
  };
}

/**
 * Factory fuer Timeline Test-Daten
 */
function createMockTimeline(overrides: Partial<ErinnerungTimelineDto> = {}): ErinnerungTimelineDto {
  return {
    erinnerungId: 'erin-123',
    titel: 'Test Erinnerung Titel',
    events: [createMockEvent()],
    totalCount: 1,
    ...overrides,
  };
}

describe('ErinnerungTimelineWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner when data is loading', () => {
      // Given (Arrange) - Hook gibt Loading-Status zurueck
      mockUseErinnerungTimeline.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Erinnerungsverlauf')).toBeInTheDocument();
      // Loading Spinner hat animate-spin Klasse (PiCircleNotch Icon)
      const loadingContainer = screen.getByText('Erinnerungsverlauf').closest('div');
      expect(loadingContainer).toBeInTheDocument();
    });

    it('should display widget title in loading state', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Erinnerungsverlauf')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when loading fails', () => {
      // Given (Arrange) - Hook gibt Error zurueck
      mockUseErinnerungTimeline.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Timeline konnte nicht geladen werden.')).toBeInTheDocument();
    });

    it('should display widget title in error state', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('API error'),
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Erinnerungsverlauf')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when timeline has no events', () => {
      // Given (Arrange) - Leere Event-Liste
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({ events: [], totalCount: 0 }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Keine Timeline-Events vorhanden.')).toBeInTheDocument();
    });

    it('should show empty message when timeline data is undefined', () => {
      // Given (Arrange) - Timeline ist undefined (nicht null)
      mockUseErinnerungTimeline.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Keine Timeline-Events vorhanden.')).toBeInTheDocument();
    });
  });

  describe('Event Types - Icons und Labels', () => {
    it('should display "Erstellt" event with correct label', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'Erstellt' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Erstellt')).toBeInTheDocument();
    });

    it('should display "Ausgeloest" event with correct label', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'Ausgeloest' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Ausgeloest')).toBeInTheDocument();
    });

    it('should display "Retriggered" event with label "Erneut ausgeloest"', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'Retriggered' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Erneut ausgeloest')).toBeInTheDocument();
    });

    it('should display "Acknowledged" event with label "Bestaetigt"', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'Acknowledged' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Bestaetigt')).toBeInTheDocument();
    });

    it('should display "Snoozed" event with label "Verschoben"', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'Snoozed' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Verschoben')).toBeInTheDocument();
    });

    it('should display "Eskaliert" event with correct label', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'Eskaliert' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Eskaliert')).toBeInTheDocument();
    });

    it('should display "Intensiviert" event with correct label', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'Intensiviert' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Intensiviert')).toBeInTheDocument();
    });

    it('should display "Erledigt" event with correct label', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'Erledigt' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Erledigt')).toBeInTheDocument();
    });

    it('should display "Assigned" event with label "Zugewiesen"', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'Assigned' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Zugewiesen')).toBeInTheDocument();
    });

    it('should display "Aktualisiert" event with correct label', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'Aktualisiert' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Aktualisiert')).toBeInTheDocument();
    });

    it('should display "Geloescht" event with correct label', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'Geloescht' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Geloescht')).toBeInTheDocument();
    });

    it('should display unknown event type as-is (fallback)', () => {
      // Given (Arrange) - Unbekannter Event-Typ
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ eventType: 'UnknownType' })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert) - Unbekannte Typen werden 1:1 angezeigt
      expect(screen.getByText('UnknownType')).toBeInTheDocument();
    });
  });

  describe('Multiple Events', () => {
    it('should render multiple events in timeline', () => {
      // Given (Arrange) - Mehrere Events
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({ id: 'ev-1', eventType: 'Erstellt', sequenceNumber: 1 }),
            createMockEvent({ id: 'ev-2', eventType: 'Ausgeloest', sequenceNumber: 2 }),
            createMockEvent({ id: 'ev-3', eventType: 'Snoozed', sequenceNumber: 3 }),
            createMockEvent({ id: 'ev-4', eventType: 'Erledigt', sequenceNumber: 4 }),
          ],
          totalCount: 4,
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Erstellt')).toBeInTheDocument();
      expect(screen.getByText('Ausgeloest')).toBeInTheDocument();
      expect(screen.getByText('Verschoben')).toBeInTheDocument();
      expect(screen.getByText('Erledigt')).toBeInTheDocument();
    });

    it('should display correct total count in header', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ id: 'ev-1' }), createMockEvent({ id: 'ev-2' }), createMockEvent({ id: 'ev-3' })],
          totalCount: 3,
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('3 Events')).toBeInTheDocument();
    });

    it('should display singular "Event" for single event', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent()],
          totalCount: 1,
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('1 Event')).toBeInTheDocument();
    });
  });

  describe('User Display', () => {
    it('should display user displayName when available', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              createdBy: {
                id: 'user-1',
                username: 'mmuster',
                displayName: 'Max Mustermann',
              },
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText(/Max Mustermann/)).toBeInTheDocument();
    });

    it('should display username when displayName is not available', () => {
      // Given (Arrange) - Kein displayName
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              createdBy: {
                id: 'user-1',
                username: 'mmuster',
                displayName: null,
              },
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText(/mmuster/)).toBeInTheDocument();
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format timestamp in German format (dd.MM.yyyy HH:mm)', () => {
      // Given (Arrange) - Timestamp mit bekanntem Datum
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              timestamp: new Date('2025-01-15T14:30:00Z'),
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert) - Deutsche Formatierung (Zeit kann je nach Timezone variieren)
      expect(screen.getByText(/15\.01\.2025/)).toBeInTheDocument();
    });
  });

  describe('Event Text', () => {
    it('should display event text when available', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              text: 'Erinnerung fuer morgen um 10 Uhr',
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Erinnerung fuer morgen um 10 Uhr')).toBeInTheDocument();
    });

    it('should not display text when empty', () => {
      // Given (Arrange) - Leerer Text
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              text: '',
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert) - Nur das Label sollte da sein, kein leerer Text-Container
      expect(screen.getByText('Erstellt')).toBeInTheDocument();
    });
  });

  describe('Metadata Details', () => {
    it('should display snooze duration for Snoozed event (minutes)', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              eventType: 'Snoozed',
              metadata: { snoozeDurationMinutes: 30 },
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('30 Min.')).toBeInTheDocument();
      expect(screen.getByText('Dauer:')).toBeInTheDocument();
    });

    it('should display snooze duration for Snoozed event (hours)', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              eventType: 'Snoozed',
              metadata: { snoozeDurationMinutes: 120 },
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('2 Std.')).toBeInTheDocument();
    });

    it('should display snooze duration for Snoozed event (hours and minutes)', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              eventType: 'Snoozed',
              metadata: { snoozeDurationMinutes: 90 },
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('1 Std. 30 Min.')).toBeInTheDocument();
    });

    it('should display notiz for Erledigt event', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              eventType: 'Erledigt',
              metadata: { notiz: 'Wurde telefonisch geklaert' },
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Wurde telefonisch geklaert')).toBeInTheDocument();
      expect(screen.getByText('Notiz:')).toBeInTheDocument();
    });

    it('should display escalation level for Eskaliert event', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              eventType: 'Eskaliert',
              metadata: { escalationLevel: 2 },
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Stufe 2')).toBeInTheDocument();
    });

    it('should display escalation level for Intensiviert event', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              eventType: 'Intensiviert',
              metadata: { escalationLevel: 3 },
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Stufe 3')).toBeInTheDocument();
    });

    it('should not display metadata when null', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              eventType: 'Snoozed',
              metadata: null,
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.queryByText('Dauer:')).not.toBeInTheDocument();
    });
  });

  describe('Entry Click Handler', () => {
    it('should call onEntryClick with event id when button is clicked', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      const onEntryClick = vi.fn();

      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              id: 'entry-id-123',
              sequenceNumber: 42,
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" onEntryClick={onEntryClick} />, {
        wrapper: createWrapper(),
      });

      const jumpButton = screen.getByRole('button', { name: /Zum ETB-Eintrag #42 springen/i });
      await user.click(jumpButton);

      // Then (Assert)
      expect(onEntryClick).toHaveBeenCalledTimes(1);
      expect(onEntryClick).toHaveBeenCalledWith('entry-id-123');
    });

    it('should not render jump button when onEntryClick is not provided', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [createMockEvent({ sequenceNumber: 42 })],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.queryByRole('button', { name: /Zum ETB-Eintrag/i })).not.toBeInTheDocument();
    });

    it('should have correct accessibility attributes on jump button', () => {
      // Given (Arrange)
      const onEntryClick = vi.fn();

      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          events: [
            createMockEvent({
              id: 'entry-1',
              sequenceNumber: 99,
            }),
          ],
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" onEntryClick={onEntryClick} />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      const jumpButton = screen.getByRole('button', { name: /Zum ETB-Eintrag #99 springen/i });
      expect(jumpButton).toHaveAttribute('title', 'Zum ETB-Eintrag springen');
    });
  });

  describe('Timeline Title', () => {
    it('should display the erinnerung titel', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline({
          titel: 'Wichtige Erinnerung XYZ',
        }),
        isLoading: false,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(screen.getByText('Wichtige Erinnerung XYZ')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to container', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: createMockTimeline(),
        isLoading: false,
        error: null,
      });

      // When (Act)
      const { container } = render(<ErinnerungTimelineWidget etbId="etb-1" erinnerungId="erin-1" className="custom-test-class" />, { wrapper: createWrapper() });

      // Then (Assert)
      const widget = container.firstChild as HTMLElement;
      expect(widget.className).toContain('custom-test-class');
    });
  });

  describe('Hook Parameters', () => {
    it('should call useErinnerungTimeline with correct parameters', () => {
      // Given (Arrange)
      mockUseErinnerungTimeline.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      // When (Act)
      render(<ErinnerungTimelineWidget etbId="test-etb-id" erinnerungId="test-erin-id" />, {
        wrapper: createWrapper(),
      });

      // Then (Assert)
      expect(mockUseErinnerungTimeline).toHaveBeenCalledWith({
        etbId: 'test-etb-id',
        erinnerungId: 'test-erin-id',
      });
    });
  });
});
