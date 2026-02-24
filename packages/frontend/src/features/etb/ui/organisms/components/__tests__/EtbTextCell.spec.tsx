/**
 * Unit Tests fuer EtbTextCell Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 4.3:** ETB-Eintrag Befehl-Verlinkung
 * - Befehl-Link wird angezeigt wenn metadata.befehlId vorhanden
 * - Befehl-Link wird NICHT angezeigt wenn metadata.befehlId fehlt
 * - Korrekte Navigation-URL zum Befehl
 * - Link wird nicht angezeigt wenn einsatzId fehlt
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EintragDto } from '@/shared';

// Mock TanStack Router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: { children: React.ReactNode; to: string; params?: Record<string, string>; search?: Record<string, string>; [key: string]: unknown }) => (
    <a
      href={`${to.replace('$einsatzId', params?.einsatzId ?? '')}?befehlId=${search?.befehlId ?? ''}`}
      data-testid="befehl-link"
      data-to={to}
      data-params={JSON.stringify(params)}
      data-search={JSON.stringify(search)}
      {...props}
    >
      {children}
    </a>
  ),
}));

// Mock Screenshot-Validierung
vi.mock('@/features/etb/utils', () => ({
  safeValidateScreenshotUrl: () => null,
}));

// Mock Erinnerung Store
vi.mock('@/features/reminders/stores', () => ({
  setHighlightedErinnerung: vi.fn(),
}));

import { EtbTextCell } from '../EtbTextCell';

/** Factory fuer einen minimalen EintragDto */
function createMockEntry(overrides?: Partial<EintragDto>): EintragDto {
  return {
    id: 'entry-1',
    sequenceNumber: 1,
    kategorie: 'BEFEHL' as EintragDto['kategorie'],
    text: 'Befehl #1: Sofort Wasser marsch!',
    timestamp: new Date('2026-02-21T10:00:00Z'),
    version: 1,
    isAutomatic: true,
    createdBy: 'system',
    createdAt: new Date('2026-02-21T10:00:00Z'),
    isDeleted: false,
    ...overrides,
  };
}

describe('EtbTextCell', () => {
  describe('Befehl-Verlinkung (Story 4.3)', () => {
    it('should show Befehl link when metadata.befehlId is present and eventType starts with Befehl', () => {
      // Given: Eintrag mit Befehl-Metadata
      const entry = createMockEntry({
        metadata: { eventType: 'BefehlErstellt', befehlId: 'befehl-123' },
      });

      // When: Komponente wird mit einsatzId gerendert
      render(<EtbTextCell entry={entry} einsatzId="einsatz-1" />);

      // Then: Befehl-Link ist sichtbar
      const link = screen.getByTestId('befehl-link');
      expect(link).toBeInTheDocument();
      expect(screen.getByText('Befehl anzeigen')).toBeInTheDocument();
    });

    it('should NOT show Befehl link when metadata.befehlId is missing', () => {
      // Given: Eintrag ohne befehlId in Metadata
      const entry = createMockEntry({
        metadata: { eventType: 'LageUpdate' },
      });

      // When: Komponente wird gerendert
      render(<EtbTextCell entry={entry} einsatzId="einsatz-1" />);

      // Then: Kein Befehl-Link
      expect(screen.queryByTestId('befehl-link')).not.toBeInTheDocument();
      expect(screen.queryByText('Befehl anzeigen')).not.toBeInTheDocument();
    });

    it('should NOT show Befehl link when metadata is null', () => {
      // Given: Eintrag ohne Metadata
      const entry = createMockEntry({ metadata: null });

      // When: Komponente wird gerendert
      render(<EtbTextCell entry={entry} einsatzId="einsatz-1" />);

      // Then: Kein Befehl-Link
      expect(screen.queryByTestId('befehl-link')).not.toBeInTheDocument();
    });

    it('should NOT show Befehl link when eventType does not start with Befehl', () => {
      // Given: Eintrag mit anderem eventType aber befehlId
      const entry = createMockEntry({
        metadata: { eventType: 'EinsatzUpdate', befehlId: 'befehl-456' },
      });

      // When: Komponente wird gerendert
      render(<EtbTextCell entry={entry} einsatzId="einsatz-1" />);

      // Then: Kein Befehl-Link (eventType passt nicht)
      expect(screen.queryByTestId('befehl-link')).not.toBeInTheDocument();
    });

    it('should navigate to correct Befehl URL with befehlId search param', () => {
      // Given: Eintrag mit Befehl-Metadata
      const entry = createMockEntry({
        metadata: { eventType: 'BefehlQuittiert', befehlId: 'befehl-789' },
      });

      // When: Komponente wird gerendert
      render(<EtbTextCell entry={entry} einsatzId="einsatz-42" />);

      // Then: Link hat korrekte Route und Params
      const link = screen.getByTestId('befehl-link');
      expect(link).toHaveAttribute('data-to', '/app/einsatz/$einsatzId/führung/befehle');
      expect(link).toHaveAttribute('data-params', JSON.stringify({ einsatzId: 'einsatz-42' }));
      expect(link).toHaveAttribute('data-search', JSON.stringify({ befehlId: 'befehl-789' }));
    });

    it('should render Befehl link as clickable anchor element with correct href', () => {
      // Given: Eintrag mit Befehl-Metadata
      const entry = createMockEntry({
        metadata: { eventType: 'BefehlErstellt', befehlId: 'befehl-abc' },
      });

      // When: Komponente wird gerendert
      render(<EtbTextCell entry={entry} einsatzId="einsatz-1" />);

      // Then: Link ist ein klickbares Anchor-Element mit korrekter href
      const link = screen.getByRole('link', { name: /befehl befehl-abc anzeigen/i });
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', expect.stringContaining('befehlId=befehl-abc'));
    });

    it('should NOT show Befehl link when einsatzId is not provided', () => {
      // Given: Eintrag mit Befehl-Metadata aber ohne einsatzId
      const entry = createMockEntry({
        metadata: { eventType: 'BefehlErstellt', befehlId: 'befehl-123' },
      });

      // When: Komponente wird OHNE einsatzId gerendert
      render(<EtbTextCell entry={entry} />);

      // Then: Kein Befehl-Link (einsatzId fehlt)
      expect(screen.queryByTestId('befehl-link')).not.toBeInTheDocument();
    });
  });

  describe('Text-Rendering', () => {
    it('should render entry text', () => {
      // Given: Eintrag mit Text
      const entry = createMockEntry({ text: 'Testtext fuer ETB' });

      // When: Komponente wird gerendert
      render(<EtbTextCell entry={entry} />);

      // Then: Text ist sichtbar
      expect(screen.getByText('Testtext fuer ETB')).toBeInTheDocument();
    });

    it('should apply line-through styling for deleted entries', () => {
      // Given: Geloeschter Eintrag
      const entry = createMockEntry({ text: 'Geloeschter Text' });

      // When: Komponente wird mit isDeleted=true gerendert
      render(<EtbTextCell entry={entry} isDeleted />);

      // Then: Text hat line-through Klasse
      const textElement = screen.getByText('Geloeschter Text');
      expect(textElement.className).toMatch(/line-through/);
    });
  });
});
