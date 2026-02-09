import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ItemTypeBadge } from '../ItemTypeBadge';

describe('ItemTypeBadge', () => {
  // --- AC3: Typ-Badge auf jeder Karte ---

  describe('Notiz-Variante', () => {
    it('should render "Notiz" label', () => {
      // Given ein ItemTypeBadge vom Typ "notiz"
      render(<ItemTypeBadge type="notiz" />);

      // Then wird "Notiz" angezeigt
      expect(screen.getByText('Notiz')).toBeInTheDocument();
    });

    it('should apply slate/neutral styling', () => {
      // Given ein ItemTypeBadge vom Typ "notiz"
      const { container } = render(<ItemTypeBadge type="notiz" />);

      // Then hat der Badge slate-Farben (neutral)
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bg-slate-100');
      expect(badge.className).toContain('text-slate-600');
    });

    it('should include PiNotepad icon', () => {
      // Given ein ItemTypeBadge vom Typ "notiz"
      render(<ItemTypeBadge type="notiz" />);

      // Then existiert ein dekoratives Icon
      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Erinnerung-Variante', () => {
    it('should render "Erinnerung" label', () => {
      // Given ein ItemTypeBadge vom Typ "erinnerung"
      render(<ItemTypeBadge type="erinnerung" />);

      // Then wird "Erinnerung" angezeigt
      expect(screen.getByText('Erinnerung')).toBeInTheDocument();
    });

    it('should apply amber/warm styling', () => {
      // Given ein ItemTypeBadge vom Typ "erinnerung"
      const { container } = render(<ItemTypeBadge type="erinnerung" />);

      // Then hat der Badge amber-Farben (warm)
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bg-amber-100');
      expect(badge.className).toContain('text-amber-700');
    });

    it('should include PiBellRinging icon', () => {
      // Given ein ItemTypeBadge vom Typ "erinnerung"
      render(<ItemTypeBadge type="erinnerung" />);

      // Then existiert ein dekoratives Icon
      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  // --- AC4: Dark Mode Konsistenz ---

  describe('Dark Mode Klassen', () => {
    it('should include dark mode classes for notiz', () => {
      // Given ein ItemTypeBadge vom Typ "notiz"
      const { container } = render(<ItemTypeBadge type="notiz" />);

      // Then enthält der Badge Dark-Mode-Klassen
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('dark:bg-slate-700/50');
      expect(badge.className).toContain('dark:text-slate-400');
    });

    it('should include dark mode classes for erinnerung', () => {
      // Given ein ItemTypeBadge vom Typ "erinnerung"
      const { container } = render(<ItemTypeBadge type="erinnerung" />);

      // Then enthält der Badge Dark-Mode-Klassen
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('dark:bg-amber-900/30');
      expect(badge.className).toContain('dark:text-amber-400');
    });
  });

  // --- Zusätzliche Props ---

  describe('className Prop', () => {
    it('should merge additional className', () => {
      // Given ein ItemTypeBadge mit zusätzlicher className
      const { container } = render(<ItemTypeBadge type="notiz" className="mt-2" />);

      // Then wird die Klasse gemerged
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('mt-2');
    });
  });
});
