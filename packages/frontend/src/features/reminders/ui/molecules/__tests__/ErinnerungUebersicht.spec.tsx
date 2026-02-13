/**
 * Unit Tests fuer ErinnerungUebersicht Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 9.1 Task 10:**
 * - Korrekte Counts fuer verschiedene Status
 * - Alle 5 Karten angezeigt
 * - "0" bei leerer Erinnerungsliste (AC5)
 * - Collapsible: collapsed Zustand zeigt keine Karten
 * - Danger-Variante fuer Eskaliert-Karte
 * - Warning-Variante fuer Aktiv-Karte wenn > 0
 * - Default-Variante fuer Aktiv-Karte wenn 0
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErinnerungUebersicht } from '../ErinnerungUebersicht';
import type { ErinnerungResponseDto } from '@/shared';

/** Minimale Erinnerung-Testdaten */
const createErinnerung = (overrides: Partial<ErinnerungResponseDto> & { id: string }): ErinnerungResponseDto => ({
  einsatzId: 'einsatz-1',
  titel: 'Test Erinnerung',
  beschreibung: null,
  faelligAm: new Date(Date.now() + 60_000).toISOString(),
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

const mixedErinnerungen: ErinnerungResponseDto[] = [
  createErinnerung({ id: 'e-1', status: 'GEPLANT' }),
  createErinnerung({ id: 'e-2', status: 'AUSGELOEST' }),
  createErinnerung({ id: 'e-3', status: 'ACKNOWLEDGED' }),
  createErinnerung({ id: 'e-4', status: 'SNOOZED' }),
  createErinnerung({ id: 'e-5', status: 'ESKALIERT' }),
  createErinnerung({ id: 'e-6', status: 'ERLEDIGT' }),
  createErinnerung({ id: 'e-7', status: 'ERLEDIGT' }),
  createErinnerung({ id: 'e-8', status: 'ACKNOWLEDGED' }),
];

describe('ErinnerungUebersicht', () => {
  it('should show correct counts for mixed status erinnerungen', () => {
    // Given (Arrange) - 8 Erinnerungen mit verschiedenen Status
    // total=8, acknowledged=2, eskaliert=1, erledigt=2, active=6 (GEPLANT+AUSGELOEST+2xACKNOWLEDGED+SNOOZED+ESKALIERT)
    // When (Act)
    render(<ErinnerungUebersicht erinnerungen={mixedErinnerungen} />);

    // Then (Assert) - Pruefe ueber die zugehoerigen Titel-Labels
    const cards = screen.getAllByText(/^\d+$/).map((el) => ({
      value: el.textContent,
      title: el.closest('div.rounded-lg')?.querySelector('p.text-sm')?.textContent,
    }));

    expect(cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '8', title: 'Gesamt erstellt' }),
        expect.objectContaining({ value: '2', title: 'Acknowledged' }),
        expect.objectContaining({ value: '1', title: 'Eskaliert' }),
        expect.objectContaining({ value: '2', title: 'Erledigt' }),
        expect.objectContaining({ value: '6', title: 'Aktuell aktiv' }),
      ]),
    );
  });

  it('should show all 5 stat cards', () => {
    // Given (Arrange)
    // When (Act)
    render(<ErinnerungUebersicht erinnerungen={mixedErinnerungen} />);

    // Then (Assert)
    expect(screen.getByText('Gesamt erstellt')).toBeInTheDocument();
    expect(screen.getByText('Acknowledged')).toBeInTheDocument();
    expect(screen.getByText('Eskaliert')).toBeInTheDocument();
    expect(screen.getByText('Erledigt')).toBeInTheDocument();
    expect(screen.getByText('Aktuell aktiv')).toBeInTheDocument();
  });

  it('should show "0" for all cards when no erinnerungen present (AC5)', () => {
    // Given (Arrange)
    // When (Act)
    render(<ErinnerungUebersicht erinnerungen={[]} />);

    // Then (Assert) - Alle 5 Karten zeigen 0
    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(5);
  });

  it('should collapse and show no cards when toggle is clicked', () => {
    // Given (Arrange)
    render(<ErinnerungUebersicht erinnerungen={mixedErinnerungen} />);
    const toggleButton = screen.getByRole('button', { name: /Erinnerungs-Übersicht/ });

    // Karten sind initial sichtbar
    expect(screen.getByText('Gesamt erstellt')).toBeInTheDocument();

    // When (Act) - Klick auf Toggle-Button
    fireEvent.click(toggleButton);

    // Then (Assert) - Karten sind nicht mehr sichtbar
    expect(screen.queryByText('Gesamt erstellt')).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should use danger variant for Eskaliert card', () => {
    // Given (Arrange)
    const erinnerungen = [createErinnerung({ id: 'e-1', status: 'ESKALIERT' })];

    // When (Act)
    render(<ErinnerungUebersicht erinnerungen={erinnerungen} />);

    // Then (Assert) - Eskaliert-Karte hat danger-Styling (rote Farben)
    const eskaliertCard = screen.getByText('Eskaliert').closest('div.rounded-lg');
    expect(eskaliertCard?.className).toMatch(/red/);
  });

  it('should use warning variant for Aktiv card when active count > 0', () => {
    // Given (Arrange)
    const erinnerungen = [createErinnerung({ id: 'e-1', status: 'GEPLANT' })];

    // When (Act)
    render(<ErinnerungUebersicht erinnerungen={erinnerungen} />);

    // Then (Assert) - Aktiv-Karte hat warning-Styling (amber Farben)
    const aktivCard = screen.getByText('Aktuell aktiv').closest('div.rounded-lg');
    expect(aktivCard?.className).toMatch(/amber/);
  });

  it('should use default variant for Aktiv card when active count is 0', () => {
    // Given (Arrange) - Nur ERLEDIGT (nicht aktiv)
    const erinnerungen = [createErinnerung({ id: 'e-1', status: 'ERLEDIGT' })];

    // When (Act)
    render(<ErinnerungUebersicht erinnerungen={erinnerungen} />);

    // Then (Assert) - Aktiv-Karte hat default-Styling (kein amber/warning)
    const aktivCard = screen.getByText('Aktuell aktiv').closest('div.rounded-lg');
    expect(aktivCard?.className).not.toMatch(/amber/);
    expect(aktivCard?.className).not.toMatch(/red/);
  });

  it('should be expanded by default with aria-expanded="true"', () => {
    // Given (Arrange)
    // When (Act)
    render(<ErinnerungUebersicht erinnerungen={[]} />);

    // Then (Assert)
    const toggleButton = screen.getByRole('button', { name: /Erinnerungs-Übersicht/ });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should re-expand after collapsing', () => {
    // Given (Arrange)
    render(<ErinnerungUebersicht erinnerungen={mixedErinnerungen} />);
    const toggleButton = screen.getByRole('button', { name: /Erinnerungs-Übersicht/ });

    // When (Act) - Collapse, dann wieder expand
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);

    // Then (Assert)
    expect(screen.getByText('Gesamt erstellt')).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });
});
