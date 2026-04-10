/**
 * Unit Tests für ConnectionStatusBadge Atom
 *
 * Verifiziert Status-basiertes Rendering:
 * - Punkt-Farbe pro Status
 * - Puls-Animation für "connecting"
 * - Label-Anzeige (versteckt bei "connected")
 * - Accessibility-Attribute
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatusBadge } from '../ConnectionStatusBadge.atom';

describe('ConnectionStatusBadge', () => {
  describe('Rendering pro Status', () => {
    it('sollte "Verbunden" Status mit grünem Punkt rendern', () => {
      render(<ConnectionStatusBadge status="connected" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'WebSocket-Status: Verbunden');
      // Label sollte bei "connected" nicht sichtbar sein
      expect(screen.queryByText('Verbunden')).not.toBeInTheDocument();
    });

    it('sollte "Verbinde…" Status mit gelbem Punkt und Label rendern', () => {
      render(<ConnectionStatusBadge status="connecting" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'WebSocket-Status: Verbinde\u2026');
      expect(screen.getByText('Verbinde\u2026')).toBeInTheDocument();
    });

    it('sollte "Offline" Status mit rotem Punkt und Label rendern', () => {
      render(<ConnectionStatusBadge status="disconnected" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'WebSocket-Status: Offline');
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('sollte "Verbindungsfehler" Status mit rotem Punkt und Label rendern', () => {
      render(<ConnectionStatusBadge status="error" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'WebSocket-Status: Verbindungsfehler');
      expect(screen.getByText('Verbindungsfehler')).toBeInTheDocument();
    });
  });

  describe('Puls-Animation', () => {
    it('sollte Puls-Animation nur bei "connecting" anzeigen', () => {
      const { container } = render(<ConnectionStatusBadge status="connecting" />);

      // Puls-Element hat animate-ping Klasse
      const pingElement = container.querySelector('.animate-ping');
      expect(pingElement).toBeInTheDocument();
    });

    it('sollte keine Puls-Animation bei "connected" haben', () => {
      const { container } = render(<ConnectionStatusBadge status="connected" />);

      const pingElement = container.querySelector('.animate-ping');
      expect(pingElement).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('sollte role="status" und aria-live="polite" haben', () => {
      render(<ConnectionStatusBadge status="connected" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Custom className', () => {
    it('sollte zusätzliche CSS-Klassen übernehmen', () => {
      render(<ConnectionStatusBadge status="connected" className="custom-class" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('custom-class');
    });
  });
});
