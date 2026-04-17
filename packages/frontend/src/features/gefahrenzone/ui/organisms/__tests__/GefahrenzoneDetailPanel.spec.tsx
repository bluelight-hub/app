import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const mockDelete = vi.fn();
const mockMatrix = vi.fn();
vi.mock('@/shared', () => ({
  api: {
    gefahrenzonen: () => ({
      gefahrenzoneControllerDeleteVAlpha: mockDelete,
      gefahrenzoneControllerListVAlpha: vi.fn(),
      gefahrenzoneControllerCreateVAlpha: vi.fn(),
      gefahrenzoneControllerUpdateGeometryVAlpha: vi.fn(),
    }),
    gefahrenmatrix: () => ({
      gefahrenmatrixControllerUpdateBewertungVAlpha: mockMatrix,
    }),
  },
}));

vi.mock('@/features/lagekarte/detail-providers/warnstufe-style', () => ({
  getWarnstufeMapStyle: () => ({ fillColor: 'x', strokeColor: 'y', fillOpacity: 1, strokeWidth: 2 }),
  WARNSTUFE_CHIP_STYLES: {
    KEINE: { bg: 'bg', text: 'text', border: 'border', icon: 'icon', kuerzel: '—' },
    NIEDRIG: { bg: 'bg', text: 'text', border: 'border', icon: 'icon', kuerzel: 'N' },
    MITTEL: { bg: 'bg', text: 'text', border: 'border', icon: 'icon', kuerzel: 'M' },
    HOCH: { bg: 'bg', text: 'text', border: 'border', icon: 'icon', kuerzel: 'H' },
    AKUT: { bg: 'bg', text: 'text', border: 'border', icon: 'icon', kuerzel: 'A' },
  },
}));

import { GefahrenzoneDetailPanel } from '../GefahrenzoneDetailPanel';

const zone: GefahrenzoneDto = {
  id: 'z-1',
  einsatzId: 'e-1',
  gefahrentyp: 'BRAND',
  schutzobjekt: 'MENSCHEN',
  geometryType: 'POLYGON',
  geometry: {} as unknown as { [key: string]: unknown },
  bezeichnung: 'Testzone',
  warnstufe: 'HOCH',
  erstelltVon: 'user-a',
  aktualisiertVon: null,
  erstelltAm: new Date('2026-01-01T10:00:00Z'),
  aktualisiertAm: new Date('2026-01-01T10:00:00Z'),
};

function renderPanel(props?: Partial<React.ComponentProps<typeof GefahrenzoneDetailPanel>>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const rendered = render(<GefahrenzoneDetailPanel zone={zone} einsatzId="e-1" {...props} />, { wrapper });
  return { rendered, client };
}

describe('GefahrenzoneDetailPanel', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockDelete.mockReset();
    mockMatrix.mockReset();
  });

  it('rendert Header mit Gefahrentyp-Label und Schutzobjekt', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: /Brand/i })).toBeInTheDocument();
    expect(screen.getByText(/Menschen/i)).toBeInTheDocument();
    expect(screen.getByText('Testzone')).toBeInTheDocument();
  });

  it('"Zur Matrix-Zelle" navigiert mit korrektem focus-Search-Param', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Zur Matrix-Zelle/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/app/einsatz/$einsatzId/sicherheit/gefahren',
        params: { einsatzId: 'e-1' },
        search: expect.objectContaining({ focus: 'cell:BRAND:MENSCHEN' }),
      }),
    );
  });

  it('Löschen zeigt Confirm-Dialog und ruft Delete bei Bestätigung', async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    const onClose = vi.fn();
    renderPanel({ onClose });

    fireEvent.click(screen.getByRole('button', { name: /Zone löschen/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Löschen$/i }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith({ einsatzId: 'e-1', zoneId: 'z-1' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('Abbrechen im Confirm-Dialog behält die Zone', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Zone löschen/i }));
    fireEvent.click(screen.getByRole('button', { name: /Abbrechen/i }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('"Bearbeiten" öffnet den Inline-Popover', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Bearbeiten/i }));
    expect(screen.getByRole('heading', { name: /Zone bearbeiten/i })).toBeInTheDocument();
  });
});
