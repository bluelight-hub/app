/**
 * Unit Tests fuer KategorieFilterSelect Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 5.6:** ETB-Filter nach Kategorie (Multiselect)
 * - AC1: Filter-Dropdown mit allen 14 Kategorien
 * - AC2: Multiselect mit Checkboxen
 * - AC3: Standard: SYSTEM ausgeblendet
 * - AC4: "Alle", "Keine" und "Standard" Buttons
 * - AC5: "Mit Erinnerung" spezieller Filter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock @/shared vor dem Import der Komponente
vi.mock('@/shared', () => ({
  EintragDtoKategorieEnum: {
    Alarmierung: 'ALARMIERUNG',
    Ankunft: 'ANKUNFT',
    Befehl: 'BEFEHL',
    Erkundung: 'ERKUNDUNG',
    Lage: 'LAGE',
    Massnahme: 'MASSNAHME',
    Personal: 'PERSONAL',
    Fahrzeug: 'FAHRZEUG',
    Material: 'MATERIAL',
    Kommunikation: 'KOMMUNIKATION',
    Wetter: 'WETTER',
    Dokumentation: 'DOKUMENTATION',
    Sonstiges: 'SONSTIGES',
    System: 'SYSTEM',
  },
}));

import { KategorieFilterSelect } from '../KategorieFilterSelect';
import { resetKategorieFilter, kategorieFilterStore, showAllKategorien, toggleErinnerungFilter, ALLE_KATEGORIEN } from '../../../stores';

describe('KategorieFilterSelect', () => {
  beforeEach(() => {
    // Reset Store vor jedem Test auf Standard (SYSTEM ausgeblendet)
    resetKategorieFilter();
  });

  describe('Rendering (AC1)', () => {
    it('should render with filter count by default (13 von 14 sichtbar)', () => {
      // Given: Store im Standard-State (SYSTEM ausgeblendet)

      // When: Komponente wird gerendert
      render(<KategorieFilterSelect />);

      // Then: Button zeigt "13 von 14" (SYSTEM ausgeblendet)
      expect(screen.getByRole('button')).toHaveTextContent(/13 von 14/);
    });

    it('should show "Alle Kategorien" when nothing excluded', () => {
      // Given: Alle Kategorien sichtbar
      act(() => {
        showAllKategorien();
      });

      // When: Komponente wird gerendert
      render(<KategorieFilterSelect />);

      // Then: Button zeigt "Alle Kategorien"
      expect(screen.getByRole('button')).toHaveTextContent('Alle Kategorien');
    });

    it('should render filter icon (PiFunnel)', () => {
      // Given: Keine Vorbedingungen

      // When: Komponente wird gerendert
      render(<KategorieFilterSelect />);

      // Then: Button ist vorhanden
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Dropdown Options (AC1)', () => {
    it('should show all 14 kategorie options when opened', async () => {
      // Given: User Setup
      const user = userEvent.setup();
      render(<KategorieFilterSelect />);

      // When: Dropdown wird geoeffnet
      await user.click(screen.getByRole('button'));

      // Then: Alle 14 Kategorien sind als Buttons sichtbar
      const expectedCategories = [
        'Alarmierung',
        'Ankunft',
        'Befehl',
        'Erkundung',
        'Lage',
        'Massnahme',
        'Personal',
        'Fahrzeug',
        'Material',
        'Kommunikation',
        'Wetter',
        'Dokumentation',
        'Sonstiges',
        'System',
      ];

      for (const kategorie of expectedCategories) {
        expect(screen.getByText(kategorie)).toBeInTheDocument();
      }
    });

    it('should have "Alle", "Keine" and "Standard" quick action buttons', async () => {
      // Given: User Setup
      const user = userEvent.setup();
      render(<KategorieFilterSelect />);

      // When: Dropdown wird geoeffnet
      await user.click(screen.getByRole('button'));

      // Then: Quick-Action Buttons sind sichtbar
      expect(screen.getByText('Alle')).toBeInTheDocument();
      expect(screen.getByText('Keine')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('should have "Mit Erinnerung" special filter option', async () => {
      // Given: User Setup
      const user = userEvent.setup();
      render(<KategorieFilterSelect />);

      // When: Dropdown wird geoeffnet
      await user.click(screen.getByRole('button'));

      // Then: "Mit Erinnerung" Filter ist sichtbar
      expect(screen.getByText('Mit Erinnerung')).toBeInTheDocument();
    });
  });

  describe('Toggle Functionality (AC2)', () => {
    it('should toggle SYSTEM visibility when clicked', async () => {
      // Given: SYSTEM ist ausgeblendet (Standard)
      const user = userEvent.setup();
      render(<KategorieFilterSelect />);

      // Verify: SYSTEM ist initial ausgeblendet
      expect(kategorieFilterStore.state.excludedKategorien.has('SYSTEM')).toBe(true);

      // When: Dropdown oeffnen und SYSTEM anklicken
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('System'));

      // Then: SYSTEM ist jetzt sichtbar (nicht mehr excluded)
      expect(kategorieFilterStore.state.excludedKategorien.has('SYSTEM')).toBe(false);
    });
  });

  describe('Quick Actions (AC4)', () => {
    it('should show all categories when clicking "Alle"', async () => {
      // Given: SYSTEM ist ausgeblendet (Standard)
      const user = userEvent.setup();
      render(<KategorieFilterSelect />);
      expect(kategorieFilterStore.state.excludedKategorien.size).toBe(1);

      // When: "Alle" anklicken
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Alle'));

      // Then: Keine Kategorie ist ausgeblendet
      expect(kategorieFilterStore.state.excludedKategorien.size).toBe(0);
    });

    it('should hide all categories when clicking "Keine"', async () => {
      // Given: Nur SYSTEM ist ausgeblendet (Standard)
      const user = userEvent.setup();
      render(<KategorieFilterSelect />);
      expect(kategorieFilterStore.state.excludedKategorien.size).toBe(1);

      // When: "Keine" anklicken
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Keine'));

      // Then: Alle 14 Kategorien sind ausgeblendet
      expect(kategorieFilterStore.state.excludedKategorien.size).toBe(ALLE_KATEGORIEN.length);
    });

    it('should reset to default when clicking "Standard"', async () => {
      // Given: Alle Kategorien sichtbar
      const user = userEvent.setup();
      act(() => {
        showAllKategorien();
      });
      render(<KategorieFilterSelect />);
      expect(kategorieFilterStore.state.excludedKategorien.size).toBe(0);

      // When: "Standard" anklicken
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Standard'));

      // Then: Nur SYSTEM ist ausgeblendet
      expect(kategorieFilterStore.state.excludedKategorien.size).toBe(1);
      expect(kategorieFilterStore.state.excludedKategorien.has('SYSTEM')).toBe(true);
    });
  });

  describe('Mit Erinnerung Filter (AC5)', () => {
    it('should toggle erinnerung filter when clicked', async () => {
      // Given: Erinnerung-Filter ist deaktiviert
      const user = userEvent.setup();
      render(<KategorieFilterSelect />);
      expect(kategorieFilterStore.state.erinnerungFilterActive).toBe(false);

      // When: "Mit Erinnerung" anklicken
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Mit Erinnerung'));

      // Then: Erinnerung-Filter ist aktiviert
      expect(kategorieFilterStore.state.erinnerungFilterActive).toBe(true);
    });

    it('should show "Mit Erinnerung" in button when filter is active', () => {
      // Given: Erinnerung-Filter ist aktiviert
      act(() => {
        toggleErinnerungFilter();
      });

      // When: Komponente wird gerendert
      render(<KategorieFilterSelect />);

      // Then: Button zeigt "Mit Erinnerung"
      expect(screen.getByRole('button')).toHaveTextContent('Mit Erinnerung');
    });
  });

  describe('Visual Feedback', () => {
    it('should apply active filter styling when filter is active', () => {
      // Given: Filter ist aktiv (Standard: SYSTEM ausgeblendet)
      render(<KategorieFilterSelect />);

      // Then: Button hat Primary-Styling (aktiver Filter)
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/primary/);
    });

    it('should apply default styling when no filter is active', () => {
      // Given: Kein Filter aktiv (alle sichtbar)
      act(() => {
        showAllKategorien();
      });
      render(<KategorieFilterSelect />);

      // Then: Button hat kein Primary-Styling
      const button = screen.getByRole('button');
      expect(button.className).not.toMatch(/bg-primary-50/);
    });
  });

  describe('Store Integration', () => {
    it('should reflect store changes in UI', () => {
      // Given: Mehrere Kategorien ausgeblendet
      act(() => {
        kategorieFilterStore.setState(() => ({
          excludedKategorien: new Set(['SYSTEM', 'LAGE', 'PERSONAL']),
          erinnerungFilterActive: false,
        }));
      });

      // When: Komponente wird gerendert
      render(<KategorieFilterSelect />);

      // Then: UI zeigt "11 von 14"
      expect(screen.getByRole('button')).toHaveTextContent(/11 von 14/);
    });

    it('should work with resetKategorieFilter helper', async () => {
      // Given: Mehrere Kategorien ausgeblendet
      act(() => {
        kategorieFilterStore.setState(() => ({
          excludedKategorien: new Set(['SYSTEM', 'LAGE']),
          erinnerungFilterActive: false,
        }));
      });
      render(<KategorieFilterSelect />);

      // Verify: 2 Kategorien ausgeblendet
      expect(kategorieFilterStore.state.excludedKategorien.size).toBe(2);

      // When: Reset aufgerufen
      act(() => {
        resetKategorieFilter();
      });

      // Then: Nur SYSTEM ausgeblendet
      expect(kategorieFilterStore.state.excludedKategorien.size).toBe(1);
      expect(kategorieFilterStore.state.excludedKategorien.has('SYSTEM')).toBe(true);
    });
  });
});
