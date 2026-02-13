/**
 * Unit Tests fuer KategorieChip Component
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.1:** Kategorie erstellen
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KategorieChip } from '../KategorieChip';

describe('KategorieChip', () => {
  const defaultProps = {
    name: 'Einsatzleitung',
    farbe: '#3b82f6',
  };

  describe('Rendering (Story 8.1)', () => {
    it('should render name text', () => {
      // Given ein KategorieChip mit Name
      render(<KategorieChip {...defaultProps} />);

      // Then wird der Name angezeigt
      expect(screen.getByText('Einsatzleitung')).toBeInTheDocument();
    });

    it('should render color dot with correct background color', () => {
      // Given ein KategorieChip mit Farbe
      const { container } = render(<KategorieChip name="Lage" farbe="#ef4444" />);

      // Then wird der Farbpunkt mit der richtigen Hintergrundfarbe gerendert
      const colorDot = container.querySelector('[aria-hidden="true"]');
      expect(colorDot).toHaveStyle({ backgroundColor: '#ef4444' });
    });

    it('should render color dot with aria-hidden="true"', () => {
      // Given ein KategorieChip
      const { container } = render(<KategorieChip {...defaultProps} />);

      // Then ist der Farbpunkt mit aria-hidden="true" markiert
      const colorDot = container.querySelector('[aria-hidden="true"]');
      expect(colorDot).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      // Given ein KategorieChip mit custom className
      const { container } = render(<KategorieChip {...defaultProps} className="custom-class" />);

      // Then wird die custom className angewendet
      const chip = container.querySelector('.custom-class');
      expect(chip).toBeInTheDocument();
    });

    it('should render as inline span element', () => {
      // Given ein KategorieChip
      const { container } = render(<KategorieChip {...defaultProps} />);

      // Then wird ein span-Element gerendert
      const span = container.querySelector('span.inline-flex');
      expect(span).toBeInTheDocument();
    });
  });

  describe('Different Colors', () => {
    it('should render with blue color', () => {
      // Given ein KategorieChip mit blauer Farbe
      const { container } = render(<KategorieChip name="Test" farbe="#3b82f6" />);

      // Then wird der Farbpunkt mit Blau gerendert
      const colorDot = container.querySelector('[aria-hidden="true"]');
      expect(colorDot).toHaveStyle({ backgroundColor: '#3b82f6' });
    });

    it('should render with red color', () => {
      // Given ein KategorieChip mit roter Farbe
      const { container } = render(<KategorieChip name="Test" farbe="#ef4444" />);

      // Then wird der Farbpunkt mit Rot gerendert
      const colorDot = container.querySelector('[aria-hidden="true"]');
      expect(colorDot).toHaveStyle({ backgroundColor: '#ef4444' });
    });

    it('should render with green color', () => {
      // Given ein KategorieChip mit grüner Farbe
      const { container } = render(<KategorieChip name="Test" farbe="#10b981" />);

      // Then wird der Farbpunkt mit Grün gerendert
      const colorDot = container.querySelector('[aria-hidden="true"]');
      expect(colorDot).toHaveStyle({ backgroundColor: '#10b981' });
    });
  });

  describe('Different Names', () => {
    it('should render with short name', () => {
      // Given ein KategorieChip mit kurzem Namen
      render(<KategorieChip name="EL" farbe="#3b82f6" />);

      // Then wird der Name korrekt angezeigt
      expect(screen.getByText('EL')).toBeInTheDocument();
    });

    it('should render with long name', () => {
      // Given ein KategorieChip mit langem Namen
      render(<KategorieChip name="Einsatzleitung vor Ort" farbe="#3b82f6" />);

      // Then wird der Name korrekt angezeigt
      expect(screen.getByText('Einsatzleitung vor Ort')).toBeInTheDocument();
    });
  });
});
