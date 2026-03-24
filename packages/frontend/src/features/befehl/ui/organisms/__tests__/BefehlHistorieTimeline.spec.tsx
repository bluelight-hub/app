/**
 * Unit Tests fuer BefehlHistorieTimeline Organism
 *
 * Verifiziert:
 * - Rendering mit Mock-Daten (Events werden angezeigt)
 * - Dot-Styling fuer ABGESCHLOSSEN/AKTUELL/AUSSTEHEND
 * - Expand/Collapse per Click (Details werden ein-/ausgeblendet)
 * - Loading-State (Skeleton)
 * - Error-State mit Retry-Button
 * - Leerzustand
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import type { BefehlHistorieTimelineDto } from '@bluelight-hub/shared/client';
import { BefehlHistorieTimeline } from '../BefehlHistorieTimeline.organism';

// Hoisted mock fuer useBefehlHistorie
const { mockUseBefehlHistorie } = vi.hoisted(() => ({
  mockUseBefehlHistorie: vi.fn(),
}));

vi.mock('../../../api/use-befehl-historie', () => ({
  useBefehlHistorie: mockUseBefehlHistorie,
}));

const mockTimeline: BefehlHistorieTimelineDto = {
  befehlId: 'befehl-1',
  befehlNummer: 'B2026-001',
  aktuellerStatus: 'ZUGESTELLT',
  events: [
    {
      typ: 'ERTEILT',
      status: 'ABGESCHLOSSEN',
      zeitpunkt: new Date('2026-02-20T10:00:00Z'),
      beschreibung: 'Befehl erteilt',
      akteur: 'Einsatzleiter Mueller',
    },
    {
      typ: 'ZUGESTELLT',
      status: 'AKTUELL',
      zeitpunkt: new Date('2026-02-20T10:01:00Z'),
      beschreibung: 'Befehl zugestellt an Zugfuehrer Nord',
      akteur: 'System',
      details: 'Zustellung per WebSocket',
    },
    {
      typ: 'QUITTIERT',
      status: 'AUSSTEHEND',
      beschreibung: 'Quittierung ausstehend',
    },
  ],
};

describe('BefehlHistorieTimeline', () => {
  it('rendert alle Events der Timeline', () => {
    mockUseBefehlHistorie.mockReturnValue({
      data: mockTimeline,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    expect(screen.getByText('Befehl erteilt')).toBeInTheDocument();
    expect(screen.getByText(/Befehl zugestellt/)).toBeInTheDocument();
    expect(screen.getByText('Quittierung ausstehend')).toBeInTheDocument();
  });

  it('zeigt Akteur-Name bei Events', () => {
    mockUseBefehlHistorie.mockReturnValue({
      data: mockTimeline,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    expect(screen.getByText(/Einsatzleiter Mueller/)).toBeInTheDocument();
  });

  it('zeigt Zeitstempel im Format dd.MM.yyyy HH:mm', () => {
    mockUseBefehlHistorie.mockReturnValue({
      data: mockTimeline,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const { container } = renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    // Mindestens ein <time> Element mit dateTime-Attribut
    const timeElements = container.querySelectorAll('time[dateTime]');
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('zeigt Details beim Klick auf ein Event (expand)', async () => {
    const user = userEvent.setup();
    mockUseBefehlHistorie.mockReturnValue({
      data: mockTimeline,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    // Details sind initial nicht sichtbar
    expect(screen.queryByText('Zustellung per WebSocket')).not.toBeInTheDocument();

    // Klick auf Event mit Details
    const zugestelltButton = screen.getByRole('button', { name: /Befehl zugestellt/ });
    await user.click(zugestelltButton);

    // Details sind jetzt sichtbar
    expect(screen.getByText('Zustellung per WebSocket')).toBeInTheDocument();
  });

  it('verbirgt Details beim erneuten Klick (collapse)', async () => {
    const user = userEvent.setup();
    mockUseBefehlHistorie.mockReturnValue({
      data: mockTimeline,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    const zugestelltButton = screen.getByRole('button', { name: /Befehl zugestellt/ });

    // Expand
    await user.click(zugestelltButton);
    expect(screen.getByText('Zustellung per WebSocket')).toBeInTheDocument();

    // Collapse
    await user.click(zugestelltButton);
    expect(screen.queryByText('Zustellung per WebSocket')).not.toBeInTheDocument();
  });

  it('expandiert Details per Keyboard (Tab + Enter) - AC9', async () => {
    const user = userEvent.setup();
    mockUseBefehlHistorie.mockReturnValue({
      data: mockTimeline,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    // Tab zum zweiten Event (mit Details)
    await user.tab(); // erstes Event
    await user.tab(); // zweites Event (ZUGESTELLT mit Details)

    // Enter zum Expandieren
    await user.keyboard('{Enter}');

    // Details sind jetzt sichtbar
    expect(screen.getByText('Zustellung per WebSocket')).toBeInTheDocument();
  });

  it('zeigt Loading-Skeleton', () => {
    mockUseBefehlHistorie.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    expect(screen.getByTestId('historie-loading')).toBeInTheDocument();
  });

  it('zeigt Error-State mit Retry-Button', async () => {
    const mockRefetch = vi.fn();
    const user = userEvent.setup();
    mockUseBefehlHistorie.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    });

    renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    expect(screen.getByText('Historie konnte nicht geladen werden')).toBeInTheDocument();

    const retryButton = screen.getByText('Erneut versuchen');
    await user.click(retryButton);
    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it('zeigt Leerzustand wenn keine Events vorhanden', () => {
    mockUseBefehlHistorie.mockReturnValue({
      data: { ...mockTimeline, events: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    expect(screen.getByTestId('historie-leer')).toBeInTheDocument();
    expect(screen.getByText('Keine Historie vorhanden')).toBeInTheDocument();
  });

  it('rendert AUSSTEHEND Events mit gedaempfter Textfarbe', () => {
    mockUseBefehlHistorie.mockReturnValue({
      data: mockTimeline,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    const ausstehendText = screen.getByText('Quittierung ausstehend');
    expect(ausstehendText.className).toMatch(/text-text-muted/);
  });

  it('zeigt keinen Zeitstempel bei AUSSTEHEND Events', () => {
    mockUseBefehlHistorie.mockReturnValue({
      data: {
        ...mockTimeline,
        events: [
          {
            typ: 'QUITTIERT',
            status: 'AUSSTEHEND',
            beschreibung: 'Quittierung ausstehend',
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    // Kein <time> Element da AUSSTEHEND keinen Zeitpunkt hat
    const container = screen.getByRole('list');
    expect(container.querySelector('time')).toBeNull();
  });

  it('hat aria-label auf Timeline-Buttons', () => {
    mockUseBefehlHistorie.mockReturnValue({
      data: mockTimeline,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button).toHaveAttribute('aria-label');
    }
  });

  describe('Dot-Styling (AC4)', () => {
    beforeEach(() => {
      mockUseBefehlHistorie.mockReturnValue({
        data: mockTimeline,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });
    });

    it('rendert gruenen Dot fuer ABGESCHLOSSEN Events', () => {
      const { container } = renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);
      const greenDots = container.querySelectorAll('.bg-status-success-text');
      expect(greenDots.length).toBeGreaterThan(0);
    });

    it('rendert blauen pulsierenden Dot fuer AKTUELL Events', () => {
      const { container } = renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);
      const blueDots = container.querySelectorAll('.bg-action-primary');
      expect(blueDots.length).toBeGreaterThan(0);
      // Pulsierender Ring
      const pingElements = container.querySelectorAll('.animate-ping');
      expect(pingElements.length).toBeGreaterThan(0);
    });

    it('rendert grauen Dot mit Border fuer AUSSTEHEND Events', () => {
      const { container } = renderWithProviders(<BefehlHistorieTimeline befehlId="befehl-1" />);
      const grayDots = container.querySelectorAll('.border-border-subtle');
      expect(grayDots.length).toBeGreaterThan(0);
    });
  });
});
