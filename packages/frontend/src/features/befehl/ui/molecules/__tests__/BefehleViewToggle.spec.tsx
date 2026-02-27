/**
 * Unit Tests fuer BefehleViewToggle Molecule
 *
 * Verifiziert:
 * - Rendert drei Buttons (Kanban, Tabelle, Liste)
 * - Kanban-Button ist initial aktiv (aria-pressed="true")
 * - Click auf anderen Button wechselt View
 * - Accessibility: role="toolbar", aria-label
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
    it('rendert drei Buttons', () => {
      render(<BefehleViewToggle />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('rendert Kanban-, Tabellen- und Listen-Button mit korrekten Labels', () => {
      render(<BefehleViewToggle />);

      expect(screen.getByLabelText('Kanban-Ansicht')).toBeInTheDocument();
      expect(screen.getByLabelText('Tabellen-Ansicht')).toBeInTheDocument();
      expect(screen.getByLabelText('Listenansicht')).toBeInTheDocument();
    });
  });

  // ============================================
  // Initial State
  // ============================================

  describe('Initial State', () => {
    it('Kanban-Button ist initial aktiv (aria-pressed="true")', () => {
      render(<BefehleViewToggle />);

      expect(screen.getByLabelText('Kanban-Ansicht')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText('Tabellen-Ansicht')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByLabelText('Listenansicht')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // ============================================
  // Interaktion
  // ============================================

  describe('Interaktion', () => {
    it('Click auf Tabelle-Button wechselt View', () => {
      render(<BefehleViewToggle />);

      fireEvent.click(screen.getByLabelText('Tabellen-Ansicht'));

      expect(screen.getByLabelText('Tabellen-Ansicht')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText('Kanban-Ansicht')).toHaveAttribute('aria-pressed', 'false');
    });

    it('Click auf Listen-Button wechselt View', () => {
      render(<BefehleViewToggle />);

      fireEvent.click(screen.getByLabelText('Listenansicht'));

      expect(screen.getByLabelText('Listenansicht')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText('Kanban-Ansicht')).toHaveAttribute('aria-pressed', 'false');
    });

    it('Click auf Kanban-Button wechselt zurueck', () => {
      render(<BefehleViewToggle />);

      fireEvent.click(screen.getByLabelText('Tabellen-Ansicht'));
      fireEvent.click(screen.getByLabelText('Kanban-Ansicht'));

      expect(screen.getByLabelText('Kanban-Ansicht')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText('Tabellen-Ansicht')).toHaveAttribute('aria-pressed', 'false');
    });

    it('aktualisiert den Store bei Click', () => {
      render(<BefehleViewToggle />);

      fireEvent.click(screen.getByLabelText('Tabellen-Ansicht'));
      expect(befehleViewStore.state.view).toBe('tabelle');

      fireEvent.click(screen.getByLabelText('Listenansicht'));
      expect(befehleViewStore.state.view).toBe('liste');

      fireEvent.click(screen.getByLabelText('Kanban-Ansicht'));
      expect(befehleViewStore.state.view).toBe('kanban');
    });
  });

  // ============================================
  // Accessibility
  // ============================================

  describe('Accessibility', () => {
    it('hat role="toolbar" auf dem Container', () => {
      render(<BefehleViewToggle />);

      expect(screen.getByRole('toolbar')).toBeInTheDocument();
    });

    it('hat aria-label="Ansicht wechseln" auf dem Container', () => {
      render(<BefehleViewToggle />);

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveAttribute('aria-label', 'Ansicht wechseln');
    });

    it('Buttons haben type="button"', () => {
      render(<BefehleViewToggle />);

      const buttons = screen.getAllByRole('button');
      for (const button of buttons) {
        expect(button).toHaveAttribute('type', 'button');
      }
    });
  });

  // ============================================
  // className Prop
  // ============================================

  describe('className Prop', () => {
    it('uebergibt className an den Container', () => {
      render(<BefehleViewToggle className="my-custom-class" />);

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar.className).toContain('my-custom-class');
    });
  });
});
