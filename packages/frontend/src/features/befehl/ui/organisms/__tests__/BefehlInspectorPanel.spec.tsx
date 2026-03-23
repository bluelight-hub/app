/**
 * Tests fuer BefehlDetailPanel als Inspector-Panel (Story 4.3 AC2)
 *
 * Verifiziert:
 * - Rollenabhaengige Sichtbarkeit (BEFEHLSGEBER, ERSTELLER, EMPFAENGER, BEOBACHTER)
 * - EAMZW-Felder nur bei entsprechendem Befehlstyp
 * - Disabled Aktionen mit korrektem Tooltip-Text
 * - WeitergabeStatusListe Integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { BefehlDetailPanel } from '../BefehlDetailPanel.organism';
import { createBefehl, createEmpfaenger } from '../../../__fixtures__/befehl-test-utils';

// === Child-Component Mocks (Isolation des Units under Test) ===

vi.mock('../BefehlHistorieTimeline.organism', () => ({
  BefehlHistorieTimeline: ({ befehlId }: { befehlId: string }) => <div data-testid="historie-timeline">{befehlId}</div>,
}));

vi.mock('../KorrekturBefehlDialog.organism', () => ({
  KorrekturBefehlDialog: () => null,
}));

vi.mock('../../molecules/ZustellstatusAnzeige.molecule', () => ({
  ZustellstatusAnzeige: () => <div data-testid="zustellstatus-anzeige" />,
}));

vi.mock('../../molecules/WeitergabeStatusListe.molecule', () => ({
  WeitergabeStatusListe: ({ empfaenger, showHandlungsbedarf }: any) => (
    <div data-testid="weitergabe-status-liste" data-show-handlungsbedarf={showHandlungsbedarf}>
      {empfaenger.length} Empfaenger
    </div>
  ),
}));

vi.mock('../../molecules/BefehlKommentarThread.molecule', () => ({
  BefehlKommentarThread: () => <div data-testid="kommentar-thread" />,
}));

vi.mock('../../api/use-aendere-empfaenger-status', () => ({
  useAendereEmpfaengerStatus: () => ({ mutate: vi.fn() }),
}));

/** Konfigurierbarer Return-Wert fuer getEigenerEmpfaengerStatus (per-Test aenderbar) */
let mockEigenerEmpfaengerStatus: { istEmpfaenger: boolean; status: string; empfaengerInfo: unknown; quittierungArt: string | undefined } = {
  istEmpfaenger: false,
  status: 'NICHT_EMPFAENGER',
  empfaengerInfo: undefined,
  quittierungArt: undefined,
};

vi.mock('../../lib/befehl-utils', () => ({
  getEigenerEmpfaengerStatus: () => mockEigenerEmpfaengerStatus,
}));

// === Test-Daten ===

const baseBefehlProps = {
  id: 'befehl-1',
  nummer: 'B2026-001',
  auftrag: 'Absperrung errichten',
  befehlsgeberName: 'ZF-Meier',
  befehlstyp: 'KURZBEFEHL' as const,
  empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', name: 'ZF Nord' })],
};

const eamzwBefehlProps = {
  ...baseBefehlProps,
  befehlstyp: 'EAMZW' as const,
  ereignis: 'Hochwasser Bereich Nord',
  mittel: '2 Züge THW',
  ziel: 'Evakuierung abschließen',
  weg: 'Über B27 nach Süden',
};

/** Helper: Panel mit Default-Props rendern */
function renderPanel(overrides: Partial<Parameters<typeof BefehlDetailPanel>[0]> = {}) {
  const befehl = overrides.befehl ?? createBefehl(baseBefehlProps);
  return renderWithProviders(
    <BefehlDetailPanel befehl={befehl} isOpen={true} onClose={vi.fn()} einsatzId="einsatz-1" canKorrigieren={true} canManageStatus={true} isBeobachter={false} {...overrides} />,
  );
}

describe('BefehlInspectorPanel (Story 4.3 AC2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEigenerEmpfaengerStatus = {
      istEmpfaenger: false,
      status: 'NICHT_EMPFAENGER',
      empfaengerInfo: undefined,
      quittierungArt: undefined,
    };
  });

  // =========================================================================
  // Sektion 1: Befehlsinhalt
  // =========================================================================
  describe('Sektion 1: Befehlsinhalt', () => {
    it('zeigt Auftrag, Befehlsgeber, Zeitstempel', () => {
      renderPanel();

      // Auftrag
      expect(screen.getByText('Absperrung errichten')).toBeInTheDocument();
      // Befehlsgeber
      expect(screen.getByText('ZF-Meier')).toBeInTheDocument();
      // Zeitstempel (Sektion-Heading)
      expect(screen.getByText('Erteilt am')).toBeInTheDocument();
      // Auftrag-Heading
      expect(screen.getByText('Auftrag')).toBeInTheDocument();
      // Befehlsgeber-Heading
      expect(screen.getByText('Befehlsgeber')).toBeInTheDocument();
    });

    it('zeigt EAMZW-Felder bei Befehlstyp EAMZW', () => {
      renderPanel({ befehl: createBefehl(eamzwBefehlProps) });

      expect(screen.getByText('Ereignis')).toBeInTheDocument();
      expect(screen.getByText('Hochwasser Bereich Nord')).toBeInTheDocument();
      expect(screen.getByText('Mittel')).toBeInTheDocument();
      expect(screen.getByText('2 Züge THW')).toBeInTheDocument();
      expect(screen.getByText('Ziel')).toBeInTheDocument();
      expect(screen.getByText('Evakuierung abschließen')).toBeInTheDocument();
      expect(screen.getByText('Weg')).toBeInTheDocument();
      expect(screen.getByText('Über B27 nach Süden')).toBeInTheDocument();
    });

    it('zeigt KEINE EAMZW-Felder bei Befehlstyp KURZBEFEHL', () => {
      renderPanel();

      expect(screen.queryByText('Ereignis')).not.toBeInTheDocument();
      expect(screen.queryByText('Mittel')).not.toBeInTheDocument();
      expect(screen.queryByText('Ziel')).not.toBeInTheDocument();
      expect(screen.queryByText('Weg')).not.toBeInTheDocument();
    });

    it('zeigt Zeitvorgabe wenn vorhanden', () => {
      renderPanel({
        befehl: createBefehl({ ...baseBefehlProps, zeitvorgabe: 'Bis 14:00 Uhr' }),
      });

      expect(screen.getByText('Zeitvorgabe')).toBeInTheDocument();
      expect(screen.getByText('Bis 14:00 Uhr')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Sektion 2: Zustellstatus
  // =========================================================================
  describe('Sektion 2: Zustellstatus', () => {
    it('zeigt ZustellstatusAnzeige', () => {
      renderPanel();

      expect(screen.getByTestId('zustellstatus-anzeige')).toBeInTheDocument();
    });

    it('zeigt WeitergabeStatusListe', () => {
      renderPanel();

      expect(screen.getByTestId('weitergabe-status-liste')).toBeInTheDocument();
      expect(screen.getByText('1 Empfaenger')).toBeInTheDocument();
    });

    it('zeigt WeitergabeStatusListe mit showHandlungsbedarf fuer Nicht-Beobachter', () => {
      renderPanel({ isBeobachter: false });

      const liste = screen.getByTestId('weitergabe-status-liste');
      expect(liste).toHaveAttribute('data-show-handlungsbedarf', 'true');
    });

    it('zeigt WeitergabeStatusListe ohne showHandlungsbedarf fuer Beobachter', () => {
      renderPanel({ isBeobachter: true });

      const liste = screen.getByTestId('weitergabe-status-liste');
      expect(liste).toHaveAttribute('data-show-handlungsbedarf', 'false');
    });
  });

  // =========================================================================
  // Sektion 3: Verlauf + Kommentare
  // =========================================================================
  describe('Sektion 3: Verlauf + Kommentare', () => {
    it('zeigt Verlauf fuer BEFEHLSGEBER', () => {
      renderPanel({ isBeobachter: false });

      expect(screen.getByText('Verlauf')).toBeInTheDocument();
      expect(screen.getByTestId('historie-timeline')).toBeInTheDocument();
    });

    it('zeigt Kommentare fuer BEFEHLSGEBER', () => {
      renderPanel({ isBeobachter: false });

      expect(screen.getByText('Kommentare')).toBeInTheDocument();
      expect(screen.getByTestId('kommentar-thread')).toBeInTheDocument();
    });

    it('versteckt Verlauf fuer BEOBACHTER', () => {
      renderPanel({ isBeobachter: true });

      expect(screen.queryByText('Verlauf')).not.toBeInTheDocument();
      expect(screen.queryByTestId('historie-timeline')).not.toBeInTheDocument();
    });

    it('versteckt Kommentare fuer BEOBACHTER', () => {
      renderPanel({ isBeobachter: true });

      expect(screen.queryByText('Kommentare')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kommentar-thread')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Rollenabhaengige Sichtbarkeit
  // =========================================================================
  describe('Rollenabhaengige Sichtbarkeit', () => {
    it('BEFEHLSGEBER sieht alle Sektionen', () => {
      renderPanel({ isBeobachter: false, canKorrigieren: true });

      // Sektion 1: Befehlsinhalt
      expect(screen.getByText('Auftrag')).toBeInTheDocument();
      expect(screen.getByText('Befehlsgeber')).toBeInTheDocument();
      expect(screen.getByText('Erteilt am')).toBeInTheDocument();

      // Sektion 2: Zustellstatus
      expect(screen.getByTestId('zustellstatus-anzeige')).toBeInTheDocument();
      expect(screen.getByTestId('weitergabe-status-liste')).toBeInTheDocument();

      // Sektion 3: Verlauf + Kommentare
      expect(screen.getByText('Verlauf')).toBeInTheDocument();
      expect(screen.getByText('Kommentare')).toBeInTheDocument();

      // Korrektur-Button
      expect(screen.getByRole('button', { name: /korrektur erstellen/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /korrektur erstellen/i })).not.toBeDisabled();
    });

    it('BEOBACHTER sieht nur Befehlsinhalt und Zustellstatus', () => {
      renderPanel({ isBeobachter: true, canKorrigieren: false });

      // Sektion 1: Befehlsinhalt - sichtbar
      expect(screen.getByText('Auftrag')).toBeInTheDocument();
      expect(screen.getByText('Befehlsgeber')).toBeInTheDocument();

      // Sektion 2: Zustellstatus - sichtbar
      expect(screen.getByTestId('zustellstatus-anzeige')).toBeInTheDocument();
      expect(screen.getByTestId('weitergabe-status-liste')).toBeInTheDocument();

      // Sektion 3: Verlauf + Kommentare - NICHT sichtbar
      expect(screen.queryByText('Verlauf')).not.toBeInTheDocument();
      expect(screen.queryByText('Kommentare')).not.toBeInTheDocument();
      expect(screen.queryByTestId('historie-timeline')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kommentar-thread')).not.toBeInTheDocument();
    });

    it('BEOBACHTER sieht keinen Korrektur-Button', () => {
      renderPanel({ isBeobachter: true, canKorrigieren: false });

      expect(screen.queryByRole('button', { name: /korrektur erstellen/i })).not.toBeInTheDocument();
    });

    it('EMPFAENGER sieht Korrektur-Button disabled mit Tooltip', () => {
      renderPanel({ isBeobachter: false, canKorrigieren: false });

      const korrekturButton = screen.getByRole('button', { name: /korrektur erstellen/i });
      expect(korrekturButton).toBeDisabled();

      // Erklaerung warum disabled (Tooltip-Text im DOM)
      expect(screen.getByText(/nur ersteller\/befehlsgeber/i)).toBeInTheDocument();
    });

    it('ERSTELLER sieht alle Sektionen und aktiven Korrektur-Button', () => {
      renderPanel({ isBeobachter: false, canKorrigieren: true });

      // Alle drei Sektionen sichtbar
      expect(screen.getByText('Auftrag')).toBeInTheDocument();
      expect(screen.getByTestId('zustellstatus-anzeige')).toBeInTheDocument();
      expect(screen.getByText('Verlauf')).toBeInTheDocument();
      expect(screen.getByText('Kommentare')).toBeInTheDocument();

      // Korrektur-Button aktiv
      const korrekturButton = screen.getByRole('button', { name: /korrektur erstellen/i });
      expect(korrekturButton).not.toBeDisabled();
    });

    it('EMPFAENGER sieht Quittierung-Banner und keinen aktiven Korrektur-Button', () => {
      // Given: User ist Empfaenger mit Status AUSSTEHEND (noch nicht quittiert)
      mockEigenerEmpfaengerStatus = {
        istEmpfaenger: true,
        status: 'AUSSTEHEND',
        empfaengerInfo: createEmpfaenger({ empfaengerId: 'user-1', name: 'ZF Nord' }),
        quittierungArt: undefined,
      };

      // When: Panel mit EMPFAENGER-Berechtigungen rendern (keine Korrektur-Berechtigung)
      renderPanel({
        isBeobachter: false,
        canKorrigieren: false,
        canQuittieren: true,
        onQuittieren: vi.fn(),
        currentUserId: 'user-1',
      });

      // Then: Quittierung-Aktion ist sichtbar
      expect(screen.getByRole('button', { name: /befehl quittieren/i })).toBeInTheDocument();

      // Then: Korrektur-Button ist disabled (EMPFAENGER darf nicht korrigieren)
      const korrekturButton = screen.getByRole('button', { name: /korrektur erstellen/i });
      expect(korrekturButton).toBeDisabled();
    });
  });
});
