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
    exportJson: {
      mutate: ((..._args: unknown[]) => undefined) as (...args: unknown[]) => void,
      reset: () => undefined,
      isPending: false,
      isError: false,
      error: null as unknown,
    },
    auditTimeline: {
      data: undefined as unknown,
      error: undefined as unknown,
      isLoading: false,
      isError: false,
    },
  },
}));

vi.mock('@/features/eigenschutz/api/use-get-vorfall', () => ({
  useGetVorfall: () => mocks.query,
}));

vi.mock('@/features/eigenschutz/api/use-export-vorfall-as-pdf', () => ({
  useExportVorfallAlsPdf: () => mocks.exportPdf,
}));

vi.mock('@/features/eigenschutz/api/use-export-vorfall-as-json', () => ({
  useExportVorfallAlsJson: () => mocks.exportJson,
}));

vi.mock('@/features/eigenschutz/api/use-vorfall-audit-timeline', () => ({
  useVorfallAuditTimeline: () => mocks.auditTimeline,
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
  mocks.exportJson.mutate = ((..._args: unknown[]) => undefined) as (...args: unknown[]) => void;
  mocks.exportJson.reset = () => undefined;
  mocks.exportJson.isPending = false;
  mocks.exportJson.isError = false;
  mocks.exportJson.error = null;
  mocks.auditTimeline.data = undefined;
  mocks.auditTimeline.error = undefined;
  mocks.auditTimeline.isLoading = false;
  mocks.auditTimeline.isError = false;
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

  it('unterscheidet 403 vom generischen Fehlerpfad', () => {
    mocks.query.isError = true;
    mocks.query.error = { response: { status: 403 } };
    renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
    expect(screen.getByTestId('vorfall-detail-forbidden')).toHaveTextContent('Diese Entität gehört zu einem anderen Einsatz oder ist für dich nicht freigegeben.');
  });

  it('rendert Vorfall-Daten + IncidentContextSnapshot bei Erfolg (Story 5.1-Stub `{}` → unavailable)', () => {
    mocks.query.data = VORFALL_DTO;
    renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
    expect(screen.getByTestId('vorfall-detail-page')).toBeInTheDocument();
    expect(screen.getByTestId('vorfall-detail-section-fakten')).toHaveTextContent('Sturz beim Aufbau');
    expect(screen.getByRole('button', { name: 'Link kopieren' })).toBeInTheDocument();
    expect(screen.getByTestId('vorfall-detail-section-massnahmen')).toHaveTextContent('Erstversorgung');
    // 5.1-Bestand (`{}`) → EmptyState im Snapshot-Organism.
    expect(screen.getByTestId('incident-snapshot-unavailable')).toBeInTheDocument();
  });

  describe('Story 5.6 — Export-Historie', () => {
    it('rendert Loading-State unter dem Kontext-Snapshot', () => {
      mocks.query.data = VORFALL_DTO;
      mocks.auditTimeline.isLoading = true;
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);

      expect(screen.getByTestId('vorfall-export-history-section')).toBeInTheDocument();
      expect(screen.getByTestId('vorfall-export-history-loading')).toHaveTextContent('Export-Historie wird geladen');
    });

    it('rendert Empty-State, wenn noch kein Export protokolliert wurde', () => {
      mocks.query.data = VORFALL_DTO;
      mocks.auditTimeline.data = [];
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);

      expect(screen.getByTestId('vorfall-export-history-empty')).toHaveTextContent('Noch keine Exporte protokolliert.');
    });

    it('rendert Error-State ohne globalen Toast', () => {
      mocks.query.data = VORFALL_DTO;
      mocks.auditTimeline.isError = true;
      mocks.auditTimeline.error = new Error('boom');
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);

      expect(screen.getByTestId('vorfall-export-history-error')).toHaveTextContent('Export-Historie konnte nicht geladen werden.');
    });

    it('rendert Export-Einträge kompakt mit Format, Zeitpunkt und Nutzer', () => {
      mocks.query.data = VORFALL_DTO;
      mocks.auditTimeline.data = [
        {
          id: 'audit-1',
          type: 'exported',
          occurredAt: '2026-05-07T08:30:00.000Z',
          userId: 'user-1',
          userName: 'Rubeen',
          format: 'json',
          label: 'Export durch Rubeen als JSON',
        },
      ];
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);

      const row = screen.getByTestId('vorfall-export-history-entry-audit-1');
      expect(row).toHaveTextContent('JSON');
      expect(row).toHaveTextContent('07.05.2026 10:30');
      expect(row).toHaveTextContent('Rubeen');
      expect(row).toHaveTextContent('Export durch Rubeen als JSON');
    });
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

  describe('Story 5.5 — JSON-Export-Button', () => {
    it('(P8) rendert Action-Button mit data-testid="vorfall-export-json-button"', () => {
      mocks.query.data = VORFALL_DTO;
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      const button = screen.getByTestId('vorfall-export-json-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Als JSON exportieren');
    });

    it('(P9) JSON-Button ist disabled während exportJson.isPending', () => {
      mocks.query.data = VORFALL_DTO;
      mocks.exportJson.isPending = true;
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      expect(screen.getByTestId('vorfall-export-json-button')).toBeDisabled();
    });

    it('(P10) JSON-Button-Text wechselt zu "JSON wird erzeugt…" während Pending', () => {
      mocks.query.data = VORFALL_DTO;
      mocks.exportJson.isPending = true;
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      expect(screen.getByTestId('vorfall-export-json-button')).toHaveTextContent('JSON wird erzeugt…');
    });

    it('(P11) Klick triggert exportJson.mutate({einsatzId, vorfallId})', async () => {
      mocks.query.data = VORFALL_DTO;
      const mutate = vi.fn();
      mocks.exportJson.mutate = mutate as never;
      const { default: userEvent } = await import('@testing-library/user-event');
      const user = userEvent.setup();
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      await user.click(screen.getByTestId('vorfall-export-json-button'));
      expect(mutate).toHaveBeenCalledTimes(1);
      expect(mutate).toHaveBeenCalledWith({ einsatzId: 'cl9einsatz12345678901234', vorfallId: 'vorfall-1' });
    });

    it('(P12) Bei Error: Inline-Banner "JSON-Export fehlgeschlagen" mit funktionierendem Retry', async () => {
      mocks.query.data = VORFALL_DTO;
      mocks.exportJson.isError = true;
      mocks.exportJson.error = new Error('boom');
      const reset = vi.fn();
      const mutate = vi.fn();
      mocks.exportJson.reset = reset as never;
      mocks.exportJson.mutate = mutate as never;
      const { default: userEvent } = await import('@testing-library/user-event');
      const user = userEvent.setup();
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      const banner = screen.getByTestId('vorfall-export-json-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent('JSON-Export fehlgeschlagen');
      await user.click(screen.getByTestId('vorfall-export-json-retry-button'));
      expect(reset).toHaveBeenCalledTimes(1);
      expect(mutate).toHaveBeenCalledWith({ einsatzId: 'cl9einsatz12345678901234', vorfallId: 'vorfall-1' });
    });

    it('(P13) Bei Success: kein Banner, kein Toast — stiller Download', () => {
      mocks.query.data = VORFALL_DTO;
      // exportJson.isError === false, isPending === false (default)
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      expect(screen.queryByTestId('vorfall-export-json-error-banner')).not.toBeInTheDocument();
      expect(screen.queryByTestId('vorfall-export-error-banner')).not.toBeInTheDocument();
    });

    it('(P14) Beide Buttons unabhängig: PDF in Pending sperrt JSON-Button NICHT', () => {
      mocks.query.data = VORFALL_DTO;
      mocks.exportPdf.isPending = true;
      // exportJson bleibt idle
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      expect(screen.getByTestId('vorfall-export-pdf-button')).toBeDisabled();
      expect(screen.getByTestId('vorfall-export-json-button')).not.toBeDisabled();
    });
  });

  describe('Issue #415 — Vorfall schließen', () => {
    it('rendert „Vorfall schließen"-Button für OFFENE Vorfälle', () => {
      mocks.query.data = { ...VORFALL_DTO, status: 'OFFEN', geschlossenAm: null, geschlossenVonUserId: null, schliessungsBegruendung: null };
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      expect(screen.getByTestId('vorfall-close-button')).toBeInTheDocument();
      expect(screen.queryByTestId('vorfall-detail-section-status-closed')).not.toBeInTheDocument();
    });

    it('blendet Button aus + zeigt Statuszeile bei GESCHLOSSENEM Vorfall', () => {
      mocks.query.data = {
        ...VORFALL_DTO,
        status: 'GESCHLOSSEN',
        geschlossenAm: '2026-05-07T15:30:00.000Z',
        geschlossenVonUserId: 'user-99',
        schliessungsBegruendung: 'Abgearbeitet',
      };
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      expect(screen.queryByTestId('vorfall-close-button')).not.toBeInTheDocument();
      const section = screen.getByTestId('vorfall-detail-section-status-closed');
      expect(section).toHaveTextContent('Geschlossen');
      expect(section).toHaveTextContent('07.05.2026 17:30');
      expect(screen.getByTestId('vorfall-detail-schliessungs-begruendung')).toHaveTextContent('Abgearbeitet');
    });

    it('Klick auf „Vorfall schließen" öffnet den CloseVorfallDialog', async () => {
      mocks.query.data = { ...VORFALL_DTO, status: 'OFFEN', geschlossenAm: null, geschlossenVonUserId: null, schliessungsBegruendung: null };
      const { default: userEvent } = await import('@testing-library/user-event');
      const user = userEvent.setup();
      renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);
      await user.click(screen.getByTestId('vorfall-close-button'));
      expect(screen.getByTestId('close-vorfall-dialog')).toBeInTheDocument();
    });
  });
});
