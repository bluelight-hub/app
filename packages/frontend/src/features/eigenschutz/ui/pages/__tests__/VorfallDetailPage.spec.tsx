/**
 * Spec für `VorfallDetailPage` (Story 5.2 AC12).
 *
 * Schwerpunkte:
 * - Loading-Skeleton beim Initial-Load.
 * - 404-Banner bei `error.response.status === 404`.
 * - Erfolg: Header + Snapshot werden gerendert.
 */

import { renderWithProviders } from '@/test/utils';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    query: {
      data: undefined as unknown,
      error: undefined as unknown,
      isLoading: true,
      isError: false,
    },
    exportPdf: {
      mutate: ((..._args: unknown[]) => undefined) as (...args: unknown[]) => void,
      reset: () => undefined,
      isPending: false,
      isError: false,
      error: null as unknown,
    },
  },
}));

vi.mock('@/features/eigenschutz/api/use-get-vorfall', () => ({
  useGetVorfall: () => mocks.query,
}));

vi.mock('@/features/eigenschutz/api/use-export-vorfall-as-pdf', () => ({
  useExportVorfallAlsPdf: () => mocks.exportPdf,
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return {
    ...actual,
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a data-mock-link {...rest}>
        {children}
      </a>
    ),
  };
});

import { VorfallDetailPage } from '../VorfallDetailPage';

const VORFALL_DTO = {
  id: 'vorfall-1',
  einsatzId: 'cl9einsatz12345678901234',
  einheitId: 'cl9einheit12345678901234a',
  vorfallZeit: '2026-05-06T10:00:00.000Z',
  wann: '2026-05-06T10:00:00.000Z',
  was: 'Sturz beim Aufbau',
  wo: null,
  beteiligte: [{ kind: 'freitext', name: 'Max Mustermann', rolle: 'Sanitäter' }],
  massnahmen: 'Erstversorgung, Krankenhaus',
  unfallkasseRelevant: true,
  erfasstVonUserId: 'user-1',
  erfasstAm: '2026-05-06T10:01:00.000Z',
  kontextSnapshot: {},
  gefBeurteilungVersionId: null,
};

beforeEach(() => {
  mocks.query.data = undefined;
  mocks.query.error = undefined;
  mocks.query.isLoading = false;
  mocks.query.isError = false;
  mocks.exportPdf.mutate = ((..._args: unknown[]) => undefined) as (...args: unknown[]) => void;
  mocks.exportPdf.reset = () => undefined;
  mocks.exportPdf.isPending = false;
  mocks.exportPdf.isError = false;
  mocks.exportPdf.error = null;
});

describe('VorfallDetailPage (Story 5.2 AC12)', () => {
  it('rendert Loading-Skeleton während des initialen Loads', () => {
    mocks.query.isLoading = true;
    renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
    expect(screen.getByTestId('vorfall-detail-loading')).toBeInTheDocument();
  });

  it('rendert 404-Banner bei Cross-Einsatz / Not-Found', () => {
    mocks.query.isError = true;
    mocks.query.error = { response: { status: 404 } };
    renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
    expect(screen.getByTestId('vorfall-detail-not-found')).toBeInTheDocument();
  });

  it('rendert Generic-Error-Banner bei 500', () => {
    mocks.query.isError = true;
    mocks.query.error = { response: { status: 500 } };
    renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
    expect(screen.getByTestId('vorfall-detail-error')).toBeInTheDocument();
  });

  it('rendert Vorfall-Daten + IncidentContextSnapshot bei Erfolg (Story 5.1-Stub `{}` → unavailable)', () => {
    mocks.query.data = VORFALL_DTO;
    renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
    expect(screen.getByTestId('vorfall-detail-page')).toBeInTheDocument();
    expect(screen.getByTestId('vorfall-detail-section-fakten')).toHaveTextContent('Sturz beim Aufbau');
    expect(screen.getByTestId('vorfall-detail-section-massnahmen')).toHaveTextContent('Erstversorgung');
    // 5.1-Bestand (`{}`) → EmptyState im Snapshot-Organism.
    expect(screen.getByTestId('incident-snapshot-unavailable')).toBeInTheDocument();
  });

  describe('Story 5.4 — PDF-Export-Button', () => {
    it('(P3) rendert Primary-Action-Button mit data-testid', () => {
      mocks.query.data = VORFALL_DTO;
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      const button = screen.getByTestId('vorfall-export-pdf-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Als PDF exportieren');
    });

    it('(P4) Button ist disabled während isPending', () => {
      mocks.query.data = VORFALL_DTO;
      mocks.exportPdf.isPending = true;
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      const button = screen.getByTestId('vorfall-export-pdf-button');
      expect(button).toBeDisabled();
    });

    it('(P5) Button-Text wechselt zu "PDF wird erzeugt…" während Pending', () => {
      mocks.query.data = VORFALL_DTO;
      mocks.exportPdf.isPending = true;
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      expect(screen.getByTestId('vorfall-export-pdf-button')).toHaveTextContent('PDF wird erzeugt…');
    });

    it('(P6) ruft mutate({ einsatzId, vorfallId }) bei Klick', async () => {
      mocks.query.data = VORFALL_DTO;
      const mutate = vi.fn();
      mocks.exportPdf.mutate = mutate as never;
      const { default: userEvent } = await import('@testing-library/user-event');
      const user = userEvent.setup();
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      await user.click(screen.getByTestId('vorfall-export-pdf-button'));
      expect(mutate).toHaveBeenCalledTimes(1);
      expect(mutate).toHaveBeenCalledWith({ einsatzId: 'cl9einsatz12345678901234', vorfallId: 'vorfall-1' });
    });

    it('(P7) Bei Error: Inline-Banner mit Retry rendert (kein Toast)', async () => {
      mocks.query.data = VORFALL_DTO;
      mocks.exportPdf.isError = true;
      mocks.exportPdf.error = new Error('boom');
      const reset = vi.fn();
      const mutate = vi.fn();
      mocks.exportPdf.reset = reset as never;
      mocks.exportPdf.mutate = mutate as never;
      const { default: userEvent } = await import('@testing-library/user-event');
      const user = userEvent.setup();
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      const banner = screen.getByTestId('vorfall-export-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent('Export fehlgeschlagen');
      await user.click(screen.getByTestId('vorfall-export-retry-button'));
      expect(reset).toHaveBeenCalledTimes(1);
      expect(mutate).toHaveBeenCalledWith({ einsatzId: 'cl9einsatz12345678901234', vorfallId: 'vorfall-1' });
    });
  });
});
