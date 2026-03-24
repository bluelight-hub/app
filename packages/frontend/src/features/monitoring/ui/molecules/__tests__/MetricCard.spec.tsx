/**
 * Unit Tests fuer MetricCard Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 5.6:** Monitoring-Dashboard MetricCard
 * - Label und Value korrekt gerendert
 * - Einheit optional angezeigt
 * - Description optional angezeigt
 * - Status-Farben korrekt (ok=green, warnung=yellow, kritisch=red)
 * - ARIA-Attribute auf Status-Dot
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MetricCard } from '../MetricCard';

describe('MetricCard', () => {
  it('sollte Label und Value korrekt rendern', () => {
    // Given: MetricCard mit Label und Value
    // When: Komponente wird gerendert
    render(<MetricCard label="Zustellrate" value="98.5" />);

    // Then: Label und Value sind sichtbar
    expect(screen.getByText('Zustellrate')).toBeInTheDocument();
    expect(screen.getByText('98.5')).toBeInTheDocument();
  });

  it('sollte Einheit anzeigen wenn vorhanden', () => {
    // Given: MetricCard mit Einheit
    // When: Komponente wird gerendert
    render(<MetricCard label="Latenz" value={42} einheit="ms" />);

    // Then: Einheit ist sichtbar
    expect(screen.getByText('ms')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('sollte keine Einheit anzeigen wenn nicht vorhanden', () => {
    // Given: MetricCard ohne Einheit
    // When: Komponente wird gerendert
    const { container } = render(<MetricCard label="Anzahl" value={7} />);

    // Then: Kein Einheits-Element vorhanden (nur Label + Value)
    const baselineSpans = container.querySelectorAll('.flex.items-baseline span');
    expect(baselineSpans).toHaveLength(1); // Nur der Value-Span
  });

  it('sollte Description anzeigen wenn vorhanden', () => {
    // Given: MetricCard mit Description
    // When: Komponente wird gerendert
    render(<MetricCard label="Events" value={150} description="Letzte 24 Stunden" />);

    // Then: Description ist sichtbar
    expect(screen.getByText('Letzte 24 Stunden')).toBeInTheDocument();
  });

  it('sollte keine Description anzeigen wenn nicht vorhanden', () => {
    // Given: MetricCard ohne Description
    // When: Komponente wird gerendert
    render(<MetricCard label="Events" value={150} />);

    // Then: Kein Paragraph-Element fuer Description
    expect(screen.queryByText('Letzte 24 Stunden')).not.toBeInTheDocument();
  });

  describe('Status-Farben', () => {
    it('sollte gruenen Status-Dot fuer status=ok verwenden', () => {
      // Given: MetricCard mit Status ok
      // When: Komponente wird gerendert
      render(<MetricCard label="Test" value={1} status="ok" />);

      // Then: Status-Dot hat gruene Farbe und korrekte ARIA-Attribute
      const statusDot = screen.getByRole('img', { name: /Status: OK/i });
      expect(statusDot).toBeInTheDocument();
      expect(statusDot.className).toMatch(/bg-status-success-text/);
    });

    it('sollte gelben Status-Dot fuer status=warnung verwenden', () => {
      // Given: MetricCard mit Status warnung
      // When: Komponente wird gerendert
      render(<MetricCard label="Test" value={1} status="warnung" />);

      // Then: Status-Dot hat gelbe Farbe und korrekte ARIA-Attribute
      const statusDot = screen.getByRole('img', { name: /Status: Warnung/i });
      expect(statusDot).toBeInTheDocument();
      expect(statusDot.className).toMatch(/bg-status-warning-text/);
    });

    it('sollte roten Status-Dot fuer status=kritisch verwenden', () => {
      // Given: MetricCard mit Status kritisch
      // When: Komponente wird gerendert
      render(<MetricCard label="Test" value={1} status="kritisch" />);

      // Then: Status-Dot hat rote Farbe und korrekte ARIA-Attribute
      const statusDot = screen.getByRole('img', { name: /Status: Kritisch/i });
      expect(statusDot).toBeInTheDocument();
      expect(statusDot.className).toMatch(/bg-status-danger-text/);
    });

    it('sollte Standard-Status ok verwenden wenn kein Status angegeben', () => {
      // Given: MetricCard ohne expliziten Status
      // When: Komponente wird gerendert
      render(<MetricCard label="Test" value={1} />);

      // Then: Default Status ok mit gruenem Dot
      const statusDot = screen.getByRole('img', { name: /Status: OK/i });
      expect(statusDot).toBeInTheDocument();
      expect(statusDot.className).toMatch(/bg-status-success-text/);
    });
  });

  it('sollte ARIA-Attribute auf dem Status-Dot haben', () => {
    // Given: MetricCard mit Status
    // When: Komponente wird gerendert
    render(<MetricCard label="Metriken" value="99.9" status="ok" />);

    // Then: Status-Dot hat role="img" und aria-label
    const statusDot = screen.getByRole('img');
    expect(statusDot).toHaveAttribute('aria-label', 'Status: OK');
  });
});
