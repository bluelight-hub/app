import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KritikalitaetBadge } from '../KritikalitaetBadge.atom';
import type { KritikalitaetBadgeType } from '../KritikalitaetBadge.atom';

describe('KritikalitaetBadge', () => {
  describe('ueberfaellig', () => {
    it('zeigt "Überfällig" Label', () => {
      const { getByText } = render(<KritikalitaetBadge type="ueberfaellig" />);
      expect(getByText('Überfällig')).toBeTruthy();
    });

    it('hat aria-label', () => {
      const { container } = render(<KritikalitaetBadge type="ueberfaellig" />);
      expect(container.querySelector('[aria-label="Befehl ist überfällig"]')).toBeTruthy();
    });

    it('hat roten Hintergrund', () => {
      const { container } = render(<KritikalitaetBadge type="ueberfaellig" />);
      expect(container.firstChild).toHaveClass('bg-red-100');
    });

    it('zeigt ein Icon (aria-hidden)', () => {
      const { container } = render(<KritikalitaetBadge type="ueberfaellig" />);
      expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    });
  });

  describe('nicht-verstanden', () => {
    it('zeigt "Nicht verstanden" Label', () => {
      const { getByText } = render(<KritikalitaetBadge type="nicht-verstanden" />);
      expect(getByText('Nicht verstanden')).toBeTruthy();
    });

    it('hat aria-label', () => {
      const { container } = render(<KritikalitaetBadge type="nicht-verstanden" />);
      expect(container.querySelector('[aria-label="Befehl wurde nicht verstanden"]')).toBeTruthy();
    });

    it('hat roten Hintergrund', () => {
      const { container } = render(<KritikalitaetBadge type="nicht-verstanden" />);
      expect(container.firstChild).toHaveClass('bg-red-100');
    });
  });

  describe('rueckfrage', () => {
    it('zeigt "Rückfrage" Label', () => {
      const { getByText } = render(<KritikalitaetBadge type="rueckfrage" />);
      expect(getByText('Rückfrage')).toBeTruthy();
    });

    it('hat aria-label', () => {
      const { container } = render(<KritikalitaetBadge type="rueckfrage" />);
      expect(container.querySelector('[aria-label="Befehl hat offene Rückfrage"]')).toBeTruthy();
    });

    it('hat gelben Hintergrund', () => {
      const { container } = render(<KritikalitaetBadge type="rueckfrage" />);
      expect(container.firstChild).toHaveClass('bg-yellow-100');
    });
  });

  describe('allgemein', () => {
    it('hat inline-flex und rounded-full', () => {
      const { container } = render(<KritikalitaetBadge type="ueberfaellig" />);
      expect(container.firstChild).toHaveClass('inline-flex');
      expect(container.firstChild).toHaveClass('rounded-full');
    });

    it('akzeptiert className Prop', () => {
      const { container } = render(<KritikalitaetBadge type="ueberfaellig" className="ml-2" />);
      expect(container.firstChild).toHaveClass('ml-2');
    });

    it('alle Badge-Typen rendern ohne Fehler', () => {
      const types: KritikalitaetBadgeType[] = ['ueberfaellig', 'nicht-verstanden', 'rueckfrage'];
      for (const type of types) {
        const { container } = render(<KritikalitaetBadge type={type} />);
        expect(container.firstChild).toBeTruthy();
      }
    });
  });
});
