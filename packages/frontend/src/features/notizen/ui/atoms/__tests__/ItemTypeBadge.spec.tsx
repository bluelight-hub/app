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

    it('should apply neutral styling via design tokens', () => {
      // Given ein ItemTypeBadge vom Typ "notiz"
      const { container } = render(<ItemTypeBadge type="notiz" />);

      // Then hat der Badge semantische Token-Klassen (neutral)
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bg-surface-raised');
      expect(badge.className).toContain('text-text-secondary');
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

    it('should apply warning styling via design tokens', () => {
      // Given ein ItemTypeBadge vom Typ "erinnerung"
      const { container } = render(<ItemTypeBadge type="erinnerung" />);

      // Then hat der Badge semantische Token-Klassen (warning)
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bg-status-warning-surface');
      expect(badge.className).toContain('text-status-warning-text');
    });

    it('should include PiBellRinging icon', () => {
      // Given ein ItemTypeBadge vom Typ "erinnerung"
      render(<ItemTypeBadge type="erinnerung" />);

      // Then existiert ein dekoratives Icon
      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  // --- AC4: Dark Mode Konsistenz (via semantic tokens, no explicit dark: classes needed) ---

  describe('Design Token Klassen (Dark Mode via CSS custom properties)', () => {
    it('should use semantic tokens for notiz (dark mode handled by tokens)', () => {
      // Given ein ItemTypeBadge vom Typ "notiz"
      const { container } = render(<ItemTypeBadge type="notiz" />);

      // Then nutzt der Badge semantische Tokens statt expliziter dark:-Klassen
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bg-surface-raised');
      expect(badge.className).toContain('text-text-secondary');
      // Keine dark:-Klassen noetig - CSS custom properties uebernehmen Dark Mode
      expect(badge.className).not.toMatch(/dark:/);
    });

    it('should use semantic tokens for erinnerung (dark mode handled by tokens)', () => {
      // Given ein ItemTypeBadge vom Typ "erinnerung"
      const { container } = render(<ItemTypeBadge type="erinnerung" />);

      // Then nutzt der Badge semantische Tokens statt expliziter dark:-Klassen
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bg-status-warning-surface');
      expect(badge.className).toContain('text-status-warning-text');
      // Keine dark:-Klassen noetig - CSS custom properties uebernehmen Dark Mode
      expect(badge.className).not.toMatch(/dark:/);
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
