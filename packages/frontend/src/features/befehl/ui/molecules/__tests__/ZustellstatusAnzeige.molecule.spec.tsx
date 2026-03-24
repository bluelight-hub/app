/**
 * Unit Tests fuer ZustellstatusAnzeige Molecule
 *
 * Verifiziert:
 * - Fortschrittsbalken mit korrektem Text (kompakt)
 * - Empfaenger-Chips in erweiterter Variante
 * - Farbcodierung je nach Fortschritt
 * - Accessibility (role, aria-Attribute)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZustellstatusAnzeige } from '../ZustellstatusAnzeige.molecule';
import { createEmpfaenger } from '../../../__fixtures__/befehl-test-utils';

describe('ZustellstatusAnzeige', () => {
  // ============================================
  // Kompakte Variante (default)
  // ============================================

  describe('kompakte Variante', () => {
    it('zeigt Fortschrittsbalken mit korrektem Text bei leerer Liste (0/0)', () => {
      render(<ZustellstatusAnzeige empfaenger={[]} />);

      expect(screen.getByText('0/0 quittiert')).toBeInTheDocument();
    });

    it('zeigt korrekten Fortschrittstext bei teilweiser Quittierung (3/5)', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({
          empfaengerId: 'GF2',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({
          empfaengerId: 'GF3',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'RUECKFRAGE',
        }),
        createEmpfaenger({
          empfaengerId: 'GF4',
          zugestelltAm: new Date(),
        }),
        createEmpfaenger({
          empfaengerId: 'GF5',
          zugestelltAm: new Date(),
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      expect(screen.getByText('3/5 quittiert')).toBeInTheDocument();
    });

    it('zeigt korrekten Text bei vollstaendiger Quittierung (5/5)', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({
          empfaengerId: 'GF2',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({
          empfaengerId: 'GF3',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'RUECKFRAGE',
        }),
        createEmpfaenger({
          empfaengerId: 'GF4',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({
          empfaengerId: 'GF5',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      expect(screen.getByText('5/5 quittiert')).toBeInTheDocument();
    });

    it('zeigt korrekten Fortschrittstext bei einem Empfaenger (1/1)', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      expect(screen.getByText('1/1 quittiert')).toBeInTheDocument();
    });

    it('zeigt 0/3 bei keiner Quittierung', () => {
      const empfaenger = [
        createEmpfaenger({ empfaengerId: 'GF1', zugestelltAm: new Date() }),
        createEmpfaenger({ empfaengerId: 'GF2', zugestelltAm: new Date() }),
        createEmpfaenger({ empfaengerId: 'GF3', zugestelltAm: new Date() }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      expect(screen.getByText('0/3 quittiert')).toBeInTheDocument();
    });

    it('zeigt KEINE Empfaenger-Chips in kompakter Variante', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({
          empfaengerId: 'GF2',
          zugestelltAm: new Date(),
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      // Empfaenger-IDs sollten nicht als Text sichtbar sein
      expect(screen.queryByText('GF1')).not.toBeInTheDocument();
      expect(screen.queryByText('GF2')).not.toBeInTheDocument();
    });

    it('zeigt KEINE Empfaenger-Chips bei explizit compact', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} variant="compact" />);

      expect(screen.queryByText('GF1')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Erweiterte Variante
  // ============================================

  describe('erweiterte Variante', () => {
    it('zeigt Empfaenger-Chips mit IDs', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({
          empfaengerId: 'GF2',
          zugestelltAm: new Date(),
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} variant="expanded" />);

      expect(screen.getByText('GF1')).toBeInTheDocument();
      expect(screen.getByText('GF2')).toBeInTheDocument();
    });

    it('zeigt auch Fortschrittstext in erweiterter Variante', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({
          empfaengerId: 'GF2',
          zugestelltAm: new Date(),
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} variant="expanded" />);

      expect(screen.getByText('1/2 quittiert')).toBeInTheDocument();
    });

    it('zeigt Tooltip mit Zeitstempel fuer quittierte Empfaenger', () => {
      const quittierZeit = new Date(2026, 1, 19, 14, 30); // 19.02.2026 14:30
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: quittierZeit,
          quittierungArt: 'VERSTANDEN',
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} variant="expanded" />);

      const chip = screen.getByText('GF1');
      expect(chip).toHaveAttribute('title', expect.stringContaining('GF1'));
      expect(chip).toHaveAttribute('title', expect.stringContaining('Verstanden'));
      expect(chip).toHaveAttribute('title', expect.stringContaining('14:30'));
    });

    it('zeigt Tooltip mit "Zugestellt" fuer nicht-quittierte Empfaenger', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF2',
          zugestelltAm: new Date(),
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} variant="expanded" />);

      const chip = screen.getByText('GF2');
      expect(chip).toHaveAttribute('title', expect.stringContaining('GF2'));
      expect(chip).toHaveAttribute('title', expect.stringContaining('Zugestellt'));
    });

    it('zeigt Tooltip mit "Rückfrage" fuer RUECKFRAGE-Empfaenger', () => {
      const quittierZeit = new Date(2026, 1, 19, 15, 45);
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF3',
          zugestelltAm: new Date(),
          quittiertAm: quittierZeit,
          quittierungArt: 'RUECKFRAGE',
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} variant="expanded" />);

      const chip = screen.getByText('GF3');
      expect(chip).toHaveAttribute('title', expect.stringContaining('Rückfrage'));
      expect(chip).toHaveAttribute('title', expect.stringContaining('15:45'));
    });

    it('zeigt Tooltip mit "Nicht verstanden" fuer NICHT_VERSTANDEN-Empfaenger', () => {
      const quittierZeit = new Date(2026, 1, 19, 16, 0);
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF4',
          zugestelltAm: new Date(),
          quittiertAm: quittierZeit,
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} variant="expanded" />);

      const chip = screen.getByText('GF4');
      expect(chip).toHaveAttribute('title', expect.stringContaining('Nicht verstanden'));
      expect(chip).toHaveAttribute('title', expect.stringContaining('16:00'));
    });

    it('zeigt keine Chips bei leerer Empfaenger-Liste', () => {
      const { container } = render(<ZustellstatusAnzeige empfaenger={[]} variant="expanded" />);

      // Nur der Fortschrittsbalken-Container, keine Chip-Container
      const chipContainer = container.querySelector('.flex.flex-wrap.gap-1');
      expect(chipContainer).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Farbcodierung des Fortschrittsbalkens
  // ============================================

  describe('Fortschrittsbalken-Farbcodierung', () => {
    it('zeigt graue Farbe bei 0% Fortschritt', () => {
      const empfaenger = [createEmpfaenger({ empfaengerId: 'GF1', zugestelltAm: new Date() })];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      const progressbar = screen.getByRole('progressbar');
      const innerBar = progressbar.firstElementChild as HTMLElement;
      expect(innerBar.className).toContain('bg-surface-raised');
    });

    it('zeigt gelbe Farbe bei teilweisem Fortschritt', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({ empfaengerId: 'GF2', zugestelltAm: new Date() }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      const progressbar = screen.getByRole('progressbar');
      const innerBar = progressbar.firstElementChild as HTMLElement;
      expect(innerBar.className).toContain('bg-status-warning-text');
    });

    it('zeigt gruene Farbe bei 100% Fortschritt', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({
          empfaengerId: 'GF2',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      const progressbar = screen.getByRole('progressbar');
      const innerBar = progressbar.firstElementChild as HTMLElement;
      expect(innerBar.className).toContain('bg-status-success-text');
    });
  });

  // ============================================
  // Accessibility
  // ============================================

  describe('Accessibility', () => {
    it('hat role="progressbar"', () => {
      render(<ZustellstatusAnzeige empfaenger={[]} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('hat korrekte aria-Attribute bei leerer Liste', () => {
      render(<ZustellstatusAnzeige empfaenger={[]} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '0');
      expect(progressbar).toHaveAttribute('aria-label', 'Quittierungsfortschritt: 0 von 0 Empfängern');
    });

    it('hat korrekte aria-Attribute bei teilweiser Quittierung', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({
          empfaengerId: 'GF2',
          zugestelltAm: new Date(),
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '1');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '2');
      expect(progressbar).toHaveAttribute('aria-label', 'Quittierungsfortschritt: 1 von 2 Empfängern');
    });

    it('hat korrekte aria-Attribute bei vollstaendiger Quittierung', () => {
      const empfaenger = [
        createEmpfaenger({
          empfaengerId: 'GF1',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'VERSTANDEN',
        }),
        createEmpfaenger({
          empfaengerId: 'GF2',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'RUECKFRAGE',
        }),
        createEmpfaenger({
          empfaengerId: 'GF3',
          zugestelltAm: new Date(),
          quittiertAm: new Date(),
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '3');
      expect(progressbar).toHaveAttribute('aria-valuemax', '3');
      expect(progressbar).toHaveAttribute('aria-label', 'Quittierungsfortschritt: 3 von 3 Empfängern');
    });
  });

  // ============================================
  // Fortschrittsbalken-Breite
  // ============================================

  describe('Fortschrittsbalken-Breite', () => {
    it('setzt width auf 0% bei keiner Quittierung', () => {
      const empfaenger = [createEmpfaenger({ empfaengerId: 'GF1', zugestelltAm: new Date() })];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      const progressbar = screen.getByRole('progressbar');
      const innerBar = progressbar.firstElementChild as HTMLElement;
      expect(innerBar.style.width).toBe('0%');
    });

    it('setzt width auf 50% bei 1/2 Quittierung', () => {
      const empfaenger = [
        createEmpfaenger({ empfaengerId: 'GF1', zugestelltAm: new Date(), quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' }),
        createEmpfaenger({ empfaengerId: 'GF2', zugestelltAm: new Date() }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      const progressbar = screen.getByRole('progressbar');
      const innerBar = progressbar.firstElementChild as HTMLElement;
      expect(innerBar.style.width).toBe('50%');
    });

    it('setzt width auf 100% bei vollstaendiger Quittierung', () => {
      const empfaenger = [
        createEmpfaenger({ empfaengerId: 'GF1', zugestelltAm: new Date(), quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' }),
        createEmpfaenger({ empfaengerId: 'GF2', zugestelltAm: new Date(), quittiertAm: new Date(), quittierungArt: 'VERSTANDEN' }),
      ];

      render(<ZustellstatusAnzeige empfaenger={empfaenger} />);

      const progressbar = screen.getByRole('progressbar');
      const innerBar = progressbar.firstElementChild as HTMLElement;
      expect(innerBar.style.width).toBe('100%');
    });
  });

  // ============================================
  // className Prop
  // ============================================

  describe('className Prop', () => {
    it('uebergibt className an den aeusseren Container', () => {
      const { container } = render(<ZustellstatusAnzeige empfaenger={[]} className="my-custom-class" />);

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.className).toContain('my-custom-class');
    });
  });
});
