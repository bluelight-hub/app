/**
 * Unit Tests fuer SavePresetDialog
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.9 Task 2:** "Filter-Preset speichern Dialog"
 * - AC1: Dialog mit Name-Feld und Filter-Zusammenfassung
 * - Validierung: Leerer Name zeigt Fehler
 * - addPreset wird mit korrektem State aufgerufen
 * - onClose nach Speichern und Abbrechen
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { SavePresetDialog } from '../SavePresetDialog';

// Mock der Store-Selektoren
const mockGetTeamFilter = vi.fn();
const mockGetKategorieFilter = vi.fn();
const mockGetStatusFilter = vi.fn();
const mockGetTeamSort = vi.fn();

vi.mock('../../../stores', () => ({
  getTeamFilter: (...args: unknown[]) => mockGetTeamFilter(...args),
  getKategorieFilter: (...args: unknown[]) => mockGetKategorieFilter(...args),
  getStatusFilter: (...args: unknown[]) => mockGetStatusFilter(...args),
  getTeamSort: (...args: unknown[]) => mockGetTeamSort(...args),
}));

// Mock der addPreset Action
const mockAddPreset = vi.fn();

vi.mock('../../../stores/filter-preset.store', () => ({
  addPreset: (...args: unknown[]) => mockAddPreset(...args),
}));

describe('SavePresetDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default Store-Werte: Alle Filter auf "all", Sortierung auf "faelligkeit"
    mockGetTeamFilter.mockReturnValue({ type: 'all' });
    mockGetKategorieFilter.mockReturnValue({ type: 'all' });
    mockGetStatusFilter.mockReturnValue({ type: 'all' });
    mockGetTeamSort.mockReturnValue('faelligkeit');
  });

  it('rendert Dialog mit Name-Feld wenn isOpen=true', async () => {
    // Given (Arrange)
    // - Dialog wird mit isOpen=true gerendert

    // When (Act)
    await act(async () => {
      renderWithProviders(<SavePresetDialog {...defaultProps} />);
    });

    // Then (Assert)
    // - Dialog-Header ist sichtbar
    expect(screen.getByText('Filter-Preset speichern')).toBeInTheDocument();

    // - Name-Feld ist sichtbar
    expect(screen.getByLabelText(/preset-name/i)).toBeInTheDocument();

    // - Speichern- und Abbrechen-Buttons sind sichtbar
    expect(screen.getByRole('button', { name: /speichern/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument();
  });

  it('rendert nicht wenn isOpen=false', async () => {
    // Given (Arrange)
    // - Dialog mit isOpen=false

    // When (Act)
    await act(async () => {
      renderWithProviders(<SavePresetDialog {...defaultProps} isOpen={false} />);
    });

    // Then (Assert)
    // - Dialog-Inhalt ist nicht sichtbar
    expect(screen.queryByText('Filter-Preset speichern')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/preset-name/i)).not.toBeInTheDocument();
  });

  it('zeigt Fehler bei leerem Name nach Submit', async () => {
    // Given (Arrange)
    const user = userEvent.setup();
    renderWithProviders(<SavePresetDialog {...defaultProps} />);

    // - Name-Feld ist leer (Standardwert)

    // When (Act) - Formular absenden ohne Name
    const submitButton = screen.getByRole('button', { name: /speichern/i });
    await user.click(submitButton);

    // Then (Assert) - Fehlermeldung wird angezeigt
    await waitFor(() => {
      expect(screen.getByText(/name ist erforderlich/i)).toBeInTheDocument();
    });

    // - addPreset wurde NICHT aufgerufen
    expect(mockAddPreset).not.toHaveBeenCalled();
  });

  it('zeigt aktuelle Filter-Zusammenfassung als Chips', async () => {
    // Given (Arrange)
    // - Team-Filter auf "mine", Kategorie auf spezifische Kategorie, Status auf GEPLANT
    mockGetTeamFilter.mockReturnValue({ type: 'mine' });
    mockGetKategorieFilter.mockReturnValue({ type: 'kategorie', kategorieId: 'kat-1' });
    mockGetStatusFilter.mockReturnValue({ type: 'status', status: 'GEPLANT' });
    mockGetTeamSort.mockReturnValue('erstellt');

    const kategorienMap = new Map([['kat-1', 'Brandschutz']]);

    // When (Act)
    await act(async () => {
      renderWithProviders(<SavePresetDialog {...defaultProps} kategorienMap={kategorienMap} />);
    });

    // Then (Assert)
    // - Team-Filter Chip zeigt "Meine"
    expect(screen.getByText(/team: meine/i)).toBeInTheDocument();

    // - Kategorie-Filter Chip zeigt "Brandschutz"
    expect(screen.getByText(/kategorie: brandschutz/i)).toBeInTheDocument();

    // - Status-Filter Chip zeigt "GEPLANT"
    expect(screen.getByText(/status: geplant/i)).toBeInTheDocument();

    // - Sortierung Chip zeigt "Erstellungsdatum"
    expect(screen.getByText(/sortierung: erstellungsdatum/i)).toBeInTheDocument();
  });

  it('ruft addPreset mit Name und aktuellem Filter-State auf nach Submit', async () => {
    // Given (Arrange)
    const user = userEvent.setup();

    mockGetTeamFilter.mockReturnValue({ type: 'mine' });
    mockGetKategorieFilter.mockReturnValue({ type: 'all' });
    mockGetStatusFilter.mockReturnValue({ type: 'all' });
    mockGetTeamSort.mockReturnValue('faelligkeit');

    renderWithProviders(<SavePresetDialog {...defaultProps} />);

    // - Name eingeben
    const nameInput = screen.getByLabelText(/preset-name/i);
    await user.type(nameInput, 'Meine Erinnerungen');

    // When (Act) - Formular absenden
    const submitButton = screen.getByRole('button', { name: /speichern/i });
    await user.click(submitButton);

    // Then (Assert) - addPreset wurde mit korrekten Daten aufgerufen
    await waitFor(() => {
      expect(mockAddPreset).toHaveBeenCalledTimes(1);
    });

    expect(mockAddPreset).toHaveBeenCalledWith({
      name: 'Meine Erinnerungen',
      teamFilter: { type: 'mine' },
      kategorieFilter: { type: 'all' },
      statusFilter: { type: 'all' },
      sortierung: 'faelligkeit',
    });
  });

  it('schliesst Dialog nach Speichern (onClose wird aufgerufen)', async () => {
    // Given (Arrange)
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<SavePresetDialog {...defaultProps} onClose={onClose} />);

    // - Name eingeben
    const nameInput = screen.getByLabelText(/preset-name/i);
    await user.type(nameInput, 'Test Preset');

    // When (Act) - Formular absenden
    const submitButton = screen.getByRole('button', { name: /speichern/i });
    await user.click(submitButton);

    // Then (Assert) - onClose wurde aufgerufen
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('Abbrechen-Button schliesst Dialog', async () => {
    // Given (Arrange)
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<SavePresetDialog {...defaultProps} onClose={onClose} />);

    // When (Act) - Abbrechen klicken
    const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
    await user.click(cancelButton);

    // Then (Assert) - onClose wurde aufgerufen
    expect(onClose).toHaveBeenCalledTimes(1);

    // - addPreset wurde NICHT aufgerufen
    expect(mockAddPreset).not.toHaveBeenCalled();
  });

  it('Name-Feld hat autoFocus', async () => {
    // Given (Arrange)
    // - Dialog wird gerendert

    // When (Act)
    await act(async () => {
      renderWithProviders(<SavePresetDialog {...defaultProps} />);
    });

    // Then (Assert) - Name-Feld ist fokussiert (React autoFocus ruft .focus() auf, kein HTML-Attribut)
    const nameInput = screen.getByLabelText(/preset-name/i);
    expect(nameInput).toHaveFocus();
  });

  it('zeigt Sortierung-Chip immer (auch bei Default-Filtern)', async () => {
    // Given (Arrange)
    // - Alle Filter auf "all" (keine aktiven Filter-Chips)
    mockGetTeamFilter.mockReturnValue({ type: 'all' });
    mockGetKategorieFilter.mockReturnValue({ type: 'all' });
    mockGetStatusFilter.mockReturnValue({ type: 'all' });
    mockGetTeamSort.mockReturnValue('faelligkeit');

    // When (Act)
    await act(async () => {
      renderWithProviders(<SavePresetDialog {...defaultProps} />);
    });

    // Then (Assert)
    // - Sortierung Chip ist immer sichtbar
    expect(screen.getByText(/sortierung: faelligkeit/i)).toBeInTheDocument();

    // - Keine Team/Kategorie/Status Chips da alle auf "all"
    expect(screen.queryByText(/team:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kategorie:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/status:/i)).not.toBeInTheDocument();
  });
});
