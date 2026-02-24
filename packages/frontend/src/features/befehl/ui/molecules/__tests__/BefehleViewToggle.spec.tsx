/**
 * Unit Tests fuer BefehleViewToggle Molecule
 *
 * Verifiziert:
 * - Rendert zwei Buttons (Kanban, Tabelle)
 * - Kanban-Button ist initial aktiv (aria-checked="true")
 * - Click auf Tabelle-Button wechselt View
 * - Accessibility: role="radiogroup", aria-label
 * - className Prop wird weitergegeben
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BefehleViewToggle } from '../BefehleViewToggle.molecule';
import { befehleViewStore } from '../../../hooks/use-befehle-view-store';

describe('BefehleViewToggle', () => {
  beforeEach(() => {
    befehleViewStore.setState(() => ({ view: 'kanban' }));
  });

  // ============================================
  // Rendering
  // ============================================

  describe('Rendering', () => {
    it('rendert zwei Radio-Buttons', () => {
      render(<BefehleViewToggle />);

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
    });

    it('rendert Kanban- und Tabellen-Button mit korrekten Labels', () => {
      render(<BefehleViewToggle />);

      expect(screen.getByLabelText('Kanban-Ansicht')).toBeInTheDocument();
      expect(screen.getByLabelText('Tabellen-Ansicht')).toBeInTheDocument();
    });
  });

  // ============================================
  // Initial State
  // ============================================

  describe('Initial State', () => {
    it('Kanban-Button ist initial aktiv (aria-checked="true")', () => {
      render(<BefehleViewToggle />);

      const kanbanButton = screen.getByLabelText('Kanban-Ansicht');
      const tabelleButton = screen.getByLabelText('Tabellen-Ansicht');

      expect(kanbanButton).toHaveAttribute('aria-checked', 'true');
      expect(tabelleButton).toHaveAttribute('aria-checked', 'false');
    });
  });

  // ============================================
  // Interaktion
  // ============================================

  describe('Interaktion', () => {
    it('Click auf Tabelle-Button wechselt View', () => {
      render(<BefehleViewToggle />);

      const tabelleButton = screen.getByLabelText('Tabellen-Ansicht');
      fireEvent.click(tabelleButton);

      expect(tabelleButton).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByLabelText('Kanban-Ansicht')).toHaveAttribute('aria-checked', 'false');
    });

    it('Click auf Kanban-Button wechselt zurueck', () => {
      render(<BefehleViewToggle />);

      // Erst auf Tabelle wechseln
      fireEvent.click(screen.getByLabelText('Tabellen-Ansicht'));
      // Dann zurueck auf Kanban
      fireEvent.click(screen.getByLabelText('Kanban-Ansicht'));

      expect(screen.getByLabelText('Kanban-Ansicht')).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByLabelText('Tabellen-Ansicht')).toHaveAttribute('aria-checked', 'false');
    });

    it('aktualisiert den Store bei Click', () => {
      render(<BefehleViewToggle />);

      fireEvent.click(screen.getByLabelText('Tabellen-Ansicht'));
      expect(befehleViewStore.state.view).toBe('tabelle');

      fireEvent.click(screen.getByLabelText('Kanban-Ansicht'));
      expect(befehleViewStore.state.view).toBe('kanban');
    });
  });

  // ============================================
  // Accessibility
  // ============================================

  describe('Accessibility', () => {
    it('hat role="radiogroup" auf dem Container', () => {
      render(<BefehleViewToggle />);

      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('hat aria-label="Ansicht wechseln" auf dem Container', () => {
      render(<BefehleViewToggle />);

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAttribute('aria-label', 'Ansicht wechseln');
    });

    it('Buttons haben type="button"', () => {
      render(<BefehleViewToggle />);

      const radios = screen.getAllByRole('radio');
      for (const radio of radios) {
        expect(radio).toHaveAttribute('type', 'button');
      }
    });
  });

  // ============================================
  // className Prop
  // ============================================

  describe('className Prop', () => {
    it('uebergibt className an den Container', () => {
      render(<BefehleViewToggle className="my-custom-class" />);

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup.className).toContain('my-custom-class');
    });
  });
});
