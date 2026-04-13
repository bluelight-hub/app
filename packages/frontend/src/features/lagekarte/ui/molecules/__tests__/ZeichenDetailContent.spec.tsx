/**
 * Unit Tests für ZeichenDetailContent Molecule
 *
 * Verifiziert die getUserName-Integration in der Metadaten-Sektion.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZeichenDetailContent } from '../ZeichenDetailContent';

// ============================================
// Mocks
// ============================================

vi.mock('@/features/taktische-zeichen', () => ({
  ZeichenPreview: ({ definition }: any) => <div data-testid="zeichen-preview">{definition?.grundzeichen}</div>,
}));

vi.mock('@/features/auth/api/use-users', () => ({
  useUserNames: () => ({
    getUserName: (id: string) => (id === 'user-creator' ? 'Max Müller' : 'Anna Schmidt'),
  }),
}));

// ============================================
// Tests
// ============================================

const baseZeichen = {
  id: 'z-1',
  label: 'Einsatzleitung',
  notiz: 'Wichtige Notiz',
  zeichenDefinition: {
    grundzeichen: 'stelle',
    organisation: 'thw',
    fachaufgabe: null,
    einheit: null,
    verwaltungsstufe: null,
  },
  istPlatziert: true,
  lat: 50.12345,
  lng: 10.54321,
  mgrs: '32UMA1234567890',
  createdBy: 'user-creator',
  createdAt: '2026-03-15T10:30:00Z',
  updatedBy: 'user-updater',
  updatedAt: '2026-03-16T14:00:00Z',
} as any;

describe('ZeichenDetailContent', () => {
  describe('Metadaten mit getUserName', () => {
    it('sollte Ersteller-Namen via getUserName anzeigen', () => {
      render(<ZeichenDetailContent zeichen={baseZeichen} onUpdateLabel={vi.fn()} onUpdateNotiz={vi.fn()} onRemove={vi.fn()} isRemoving={false} />);

      expect(screen.getByText('Max Müller')).toBeInTheDocument();
    });

    it('sollte Bearbeiter-Namen via getUserName anzeigen', () => {
      render(<ZeichenDetailContent zeichen={baseZeichen} onUpdateLabel={vi.fn()} onUpdateNotiz={vi.fn()} onRemove={vi.fn()} isRemoving={false} />);

      expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
    });

    it('sollte Bearbeiter-Zeile NICHT anzeigen wenn kein updatedBy', () => {
      const ohneUpdatedBy = { ...baseZeichen, updatedBy: null };

      render(<ZeichenDetailContent zeichen={ohneUpdatedBy} onUpdateLabel={vi.fn()} onUpdateNotiz={vi.fn()} onRemove={vi.fn()} isRemoving={false} />);

      expect(screen.getByText('Max Müller')).toBeInTheDocument();
      expect(screen.queryByText('Anna Schmidt')).not.toBeInTheDocument();
    });
  });
});
