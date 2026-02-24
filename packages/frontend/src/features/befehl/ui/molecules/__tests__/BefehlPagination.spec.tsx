/**
 * Unit Tests fuer BefehlPagination Molecule
 *
 * Verifiziert:
 * - Versteckt bei totalPages <= 1
 * - Zeigt "Seite X von Y" Text
 * - Zeigt "N von M Befehlen" Anzeige
 * - Vor/Zurueck Buttons korrekt aktiviert/deaktiviert
 * - Button-Klicks rufen onPreviousPage/onNextPage auf
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BefehlPagination } from '../BefehlPagination.molecule';

const defaultProps = {
  currentPage: 1,
  totalPages: 3,
  totalItems: 47,
  pageSize: 20,
  onPreviousPage: vi.fn(),
  onNextPage: vi.fn(),
  canPreviousPage: false,
  canNextPage: true,
};

describe('BefehlPagination', () => {
  // ============================================
  // Sichtbarkeit
  // ============================================

  describe('Sichtbarkeit', () => {
    it('wird nicht gerendert bei totalPages <= 1', () => {
      const { container } = render(<BefehlPagination {...defaultProps} totalPages={1} />);
      expect(container.firstChild).toBeNull();
    });

    it('wird gerendert bei totalPages > 1', () => {
      render(<BefehlPagination {...defaultProps} />);
      expect(screen.getByRole('navigation', { name: 'Tabellen-Pagination' })).toBeInTheDocument();
    });
  });

  // ============================================
  // Anzeige
  // ============================================

  describe('Anzeige', () => {
    it('zeigt "Seite X von Y"', () => {
      render(<BefehlPagination {...defaultProps} currentPage={2} totalPages={3} />);
      expect(screen.getByText('Seite 2 von 3')).toBeInTheDocument();
    });

    it('zeigt Items-Range auf Seite 1', () => {
      render(<BefehlPagination {...defaultProps} currentPage={1} totalItems={47} pageSize={20} />);
      expect(screen.getByText(/1–20 von 47/)).toBeInTheDocument();
    });

    it('zeigt Items-Range auf Seite 2', () => {
      render(<BefehlPagination {...defaultProps} currentPage={2} totalItems={47} pageSize={20} />);
      expect(screen.getByText(/21–40 von 47/)).toBeInTheDocument();
    });

    it('zeigt Items-Range auf letzter Seite', () => {
      render(<BefehlPagination {...defaultProps} currentPage={3} totalItems={47} pageSize={20} />);
      expect(screen.getByText(/41–47 von 47/)).toBeInTheDocument();
    });
  });

  // ============================================
  // Button-Status
  // ============================================

  describe('Button-Status', () => {
    it('Zurueck-Button deaktiviert auf Seite 1', () => {
      render(<BefehlPagination {...defaultProps} canPreviousPage={false} />);
      const prevButton = screen.getByRole('button', { name: 'Vorherige Seite' });
      expect(prevButton).toBeDisabled();
    });

    it('Weiter-Button deaktiviert auf letzter Seite', () => {
      render(<BefehlPagination {...defaultProps} canNextPage={false} />);
      const nextButton = screen.getByRole('button', { name: 'Nächste Seite' });
      expect(nextButton).toBeDisabled();
    });

    it('Beide Buttons aktiviert auf Mittelseite', () => {
      render(<BefehlPagination {...defaultProps} canPreviousPage={true} canNextPage={true} />);
      expect(screen.getByRole('button', { name: 'Vorherige Seite' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Nächste Seite' })).toBeEnabled();
    });
  });

  // ============================================
  // Button-Klicks
  // ============================================

  describe('Button-Klicks', () => {
    it('ruft onPreviousPage bei Klick auf Zurueck', async () => {
      const user = userEvent.setup();
      const onPrev = vi.fn();
      render(<BefehlPagination {...defaultProps} canPreviousPage={true} onPreviousPage={onPrev} />);

      await user.click(screen.getByRole('button', { name: 'Vorherige Seite' }));
      expect(onPrev).toHaveBeenCalledOnce();
    });

    it('ruft onNextPage bei Klick auf Weiter', async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      render(<BefehlPagination {...defaultProps} canNextPage={true} onNextPage={onNext} />);

      await user.click(screen.getByRole('button', { name: 'Nächste Seite' }));
      expect(onNext).toHaveBeenCalledOnce();
    });

    it('deaktivierte Buttons loesen keine Events aus', async () => {
      const user = userEvent.setup();
      const onPrev = vi.fn();
      render(<BefehlPagination {...defaultProps} canPreviousPage={false} onPreviousPage={onPrev} />);

      await user.click(screen.getByRole('button', { name: 'Vorherige Seite' }));
      expect(onPrev).not.toHaveBeenCalled();
    });
  });
});
