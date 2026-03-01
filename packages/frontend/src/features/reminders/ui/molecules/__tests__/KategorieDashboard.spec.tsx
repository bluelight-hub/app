/**
 * Unit Tests fuer KategorieDashboard Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * Nutzt den echten TanStack Store (kein Mock) und resettet in beforeEach.
 * useKategorieStatistik ist pure Berechnung (useMemo) und wird direkt genutzt.
 *
 * **Story 8.10 Task 3:**
 * - Rendert Karten fuer alle Kategorien + "Ohne Kategorie"
 * - Rendert nichts bei leeren Kategorien (AC4)
 * - Klick setzt/toggled Kategorie-Filter
 * - Collapsible toggle funktioniert
 * - Aktive Kategorie visuell hervorgehoben (aria-pressed)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KategorieDashboard } from '../KategorieDashboard';
import { resetKategorieFilterStore, setKategorieFilter, getKategorieFilter } from '../../../stores';
import type { ErinnerungResponseDto } from '@/shared';
import type { KategorieResponseDto } from '@bluelight-hub/shared/client';

/** Minimale Kategorie-Testdaten */
const createKategorie = (overrides: Partial<KategorieResponseDto> & { id: string; name: string; farbe: string }): KategorieResponseDto => ({
  einsatzId: 'einsatz-1',
  erstelltVon: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

/** Minimale Erinnerung-Testdaten */
const createErinnerung = (overrides: Partial<ErinnerungResponseDto> & { id: string }): ErinnerungResponseDto => ({
  einsatzId: 'einsatz-1',
  titel: 'Test Erinnerung',
  beschreibung: null,
  faelligAm: new Date(Date.now() + 60_000).toISOString(), // In der Zukunft
  status: 'GEPLANT',
  erstelltVon: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  snoozeCount: 0,
  requiresNote: false,
  isRecurring: false,
  recurringCurrentCount: 0,
  ...overrides,
});

const defaultKategorien: KategorieResponseDto[] = [createKategorie({ id: 'kat-1', name: 'Leitstelle', farbe: '#FF5733' }), createKategorie({ id: 'kat-2', name: 'Sanitaet', farbe: '#33FF57' })];

const defaultErinnerungen: ErinnerungResponseDto[] = [
  createErinnerung({ id: 'e-1', kategorieId: 'kat-1' as unknown as object }),
  createErinnerung({ id: 'e-2', kategorieId: 'kat-2' as unknown as object }),
  createErinnerung({ id: 'e-3' }), // Ohne Kategorie
];

describe('KategorieDashboard', () => {
  beforeEach(() => {
    resetKategorieFilterStore();
  });

  it('should render cards for all categories plus "Ohne Kategorie"', () => {
    // Given (Arrange)
    // When (Act)
    render(<KategorieDashboard erinnerungen={defaultErinnerungen} kategorien={defaultKategorien} />);

    // Then (Assert)
    const _buttons = screen.getAllByRole('button', { pressed: false });
    // 2 Kategorien + 1 "Ohne Kategorie" + 1 Toggle-Button = 4 buttons
    // Stat Cards haben aria-pressed, pruefe per aria-label
    expect(screen.getByLabelText(/Kategorie Leitstelle/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kategorie Sanitaet/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kategorie Ohne Kategorie/)).toBeInTheDocument();
  });

  it('should render nothing when kategorien is empty (AC4)', () => {
    // Given (Arrange)
    // When (Act)
    const { container } = render(<KategorieDashboard erinnerungen={defaultErinnerungen} kategorien={[]} />);

    // Then (Assert)
    expect(container.firstChild).toBeNull();
  });

  it('should set kategorie filter on card click', () => {
    // Given (Arrange)
    render(<KategorieDashboard erinnerungen={defaultErinnerungen} kategorien={defaultKategorien} />);
    const leitstelleCard = screen.getByLabelText(/Kategorie Leitstelle/);

    // When (Act)
    fireEvent.click(leitstelleCard);

    // Then (Assert) - Karte ist jetzt aktiv (aria-pressed="true")
    expect(leitstelleCard).toHaveAttribute('aria-pressed', 'true');
  });

  it('should toggle filter back to "all" on second click', () => {
    // Given (Arrange)
    setKategorieFilter({ type: 'kategorie', kategorieId: 'kat-1' });
    render(<KategorieDashboard erinnerungen={defaultErinnerungen} kategorien={defaultKategorien} />);
    const leitstelleCard = screen.getByLabelText(/Kategorie Leitstelle/);

    // Sicherstellung: Karte ist zunächst aktiv
    expect(leitstelleCard).toHaveAttribute('aria-pressed', 'true');

    // When (Act) - Erneuter Klick toggled zurueck auf 'all'
    fireEvent.click(leitstelleCard);

    // Then (Assert) - Karte ist nicht mehr aktiv
    expect(leitstelleCard).toHaveAttribute('aria-pressed', 'false');
  });

  it('should collapse and expand the grid on toggle button click', () => {
    // Given (Arrange)
    render(<KategorieDashboard erinnerungen={defaultErinnerungen} kategorien={defaultKategorien} />);
    const toggleButton = screen.getByRole('button', { name: /Kategorien/ });

    // Grid ist initial sichtbar
    expect(screen.getByLabelText(/Kategorie Leitstelle/)).toBeInTheDocument();

    // When (Act) - Klick auf Toggle-Button zum Einklappen
    fireEvent.click(toggleButton);

    // Then (Assert) - Grid ist nicht mehr sichtbar
    expect(screen.queryByLabelText(/Kategorie Leitstelle/)).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    // When (Act) - Erneuter Klick zum Aufklappen
    fireEvent.click(toggleButton);

    // Then (Assert) - Grid ist wieder sichtbar
    expect(screen.getByLabelText(/Kategorie Leitstelle/)).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should highlight active kategorie with aria-pressed="true"', () => {
    // Given (Arrange)
    setKategorieFilter({ type: 'kategorie', kategorieId: 'kat-2' });

    // When (Act)
    render(<KategorieDashboard erinnerungen={defaultErinnerungen} kategorien={defaultKategorien} />);

    // Then (Assert)
    const sanitaetCard = screen.getByLabelText(/Kategorie Sanitaet/);
    expect(sanitaetCard).toHaveAttribute('aria-pressed', 'true');

    // Andere Karten sollten nicht aktiv sein
    const leitstelleCard = screen.getByLabelText(/Kategorie Leitstelle/);
    expect(leitstelleCard).toHaveAttribute('aria-pressed', 'false');
  });

  it('should be expanded by default (grid visible on mount)', () => {
    // Given (Arrange)
    // When (Act)
    render(<KategorieDashboard erinnerungen={defaultErinnerungen} kategorien={defaultKategorien} />);

    // Then (Assert)
    const toggleButton = screen.getByRole('button', { name: /Kategorien/ });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    // Karten sind sichtbar
    expect(screen.getByLabelText(/Kategorie Leitstelle/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kategorie Sanitaet/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kategorie Ohne Kategorie/)).toBeInTheDocument();
  });

  it('should set untagged filter on "Ohne Kategorie" click', () => {
    // Given (Arrange)
    render(<KategorieDashboard erinnerungen={defaultErinnerungen} kategorien={defaultKategorien} />);
    const ohneKategorieCard = screen.getByLabelText(/Kategorie Ohne Kategorie/);

    // When (Act)
    fireEvent.click(ohneKategorieCard);

    // Then (Assert) - "Ohne Kategorie" Karte ist aktiv
    expect(ohneKategorieCard).toHaveAttribute('aria-pressed', 'true');

    // Filter-State verifizieren: Store muss 'untagged' sein
    expect(getKategorieFilter()).toEqual({ type: 'untagged' });

    // Andere Karten sollten nicht aktiv sein
    expect(screen.getByLabelText(/Kategorie Leitstelle/)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText(/Kategorie Sanitaet/)).toHaveAttribute('aria-pressed', 'false');
  });
});
