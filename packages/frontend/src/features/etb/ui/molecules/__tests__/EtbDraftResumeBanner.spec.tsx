import { renderWithProviders, screen, fireEvent } from '@/test/utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EtbDraftResumeBanner } from '../EtbDraftResumeBanner';
import type { EtbDraftState } from '../../../types/draft-state.types';

const mockDraft: EtbDraftState = {
  version: 1,
  kategorie: 'LAGE' as never,
  text: 'Hochwasser im Bereich Mitte steigt weiterhin — aktuelle Pegelstände bei 4,2m und weiter steigend. Evakuierung eingeleitet.',
  absender: 'EL',
  empfaenger: 'Leitstelle',
  etbId: 'etb-1',
  updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // vor 5 Minuten
};

describe('EtbDraftResumeBanner', () => {
  const onRestore = vi.fn();
  const onDiscard = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rendert mit Draft-Daten', () => {
    renderWithProviders(<EtbDraftResumeBanner draft={mockDraft} onRestore={onRestore} onDiscard={onDiscard} />);

    expect(screen.getByText('Ungespeicherter Entwurf gefunden')).toBeInTheDocument();
  });

  it('zeigt relative Zeitangabe', () => {
    renderWithProviders(<EtbDraftResumeBanner draft={mockDraft} onRestore={onRestore} onDiscard={onDiscard} />);

    expect(screen.getByText(/vor 5 Minuten/)).toBeInTheDocument();
  });

  it('zeigt Text-Vorschau (gekürzt auf 80 Zeichen)', () => {
    renderWithProviders(<EtbDraftResumeBanner draft={mockDraft} onRestore={onRestore} onDiscard={onDiscard} />);

    // Text hat > 80 Zeichen, also gekürzt mit …
    const preview = screen.getByText(/Hochwasser im Bereich/);
    expect(preview.textContent).toContain('…');
  });

  it('zeigt vollständigen Text wenn <= 80 Zeichen', () => {
    const shortDraft = { ...mockDraft, text: 'Kurzer Text' };
    renderWithProviders(<EtbDraftResumeBanner draft={shortDraft} onRestore={onRestore} onDiscard={onDiscard} />);

    expect(screen.getByText(/Kurzer Text/)).toBeInTheDocument();
    expect(screen.getByText(/Kurzer Text/).textContent).not.toContain('…');
  });

  it('Fortsetzen-Button ruft onRestore auf', () => {
    renderWithProviders(<EtbDraftResumeBanner draft={mockDraft} onRestore={onRestore} onDiscard={onDiscard} />);

    fireEvent.click(screen.getByLabelText('Entwurf fortsetzen'));
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it('Verwerfen-Button ruft onDiscard auf', () => {
    renderWithProviders(<EtbDraftResumeBanner draft={mockDraft} onRestore={onRestore} onDiscard={onDiscard} />);

    fireEvent.click(screen.getByLabelText('Entwurf verwerfen'));
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('hat role="status" mit aria-label und aria-live="polite"', () => {
    renderWithProviders(<EtbDraftResumeBanner draft={mockDraft} onRestore={onRestore} onDiscard={onDiscard} />);

    const banner = screen.getByRole('status', { name: 'Ungespeicherter Entwurf' });
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('Banner ist fokussierbar (tabIndex={-1})', () => {
    renderWithProviders(<EtbDraftResumeBanner draft={mockDraft} onRestore={onRestore} onDiscard={onDiscard} />);

    const banner = screen.getByRole('status', { name: 'Ungespeicherter Entwurf' });
    expect(banner).toHaveAttribute('tabindex', '-1');
  });

  it('Buttons sind disabled wenn isRestoring=true', () => {
    renderWithProviders(<EtbDraftResumeBanner draft={mockDraft} onRestore={onRestore} onDiscard={onDiscard} isRestoring />);

    expect(screen.getByLabelText('Entwurf fortsetzen')).toBeDisabled();
    expect(screen.getByLabelText('Entwurf verwerfen')).toBeDisabled();
  });

  it('Keyboard-Navigation: Tab zwischen Buttons', async () => {
    renderWithProviders(<EtbDraftResumeBanner draft={mockDraft} onRestore={onRestore} onDiscard={onDiscard} />);

    const verwerfenBtn = screen.getByLabelText('Entwurf verwerfen');
    const fortsetzenBtn = screen.getByLabelText('Entwurf fortsetzen');

    // Beide Buttons sind im Tab-Flow
    expect(verwerfenBtn).not.toHaveAttribute('tabindex', '-1');
    expect(fortsetzenBtn).not.toHaveAttribute('tabindex', '-1');
  });

  it('hat aria-label auf den Buttons', () => {
    renderWithProviders(<EtbDraftResumeBanner draft={mockDraft} onRestore={onRestore} onDiscard={onDiscard} />);

    expect(screen.getByLabelText('Entwurf fortsetzen')).toBeInTheDocument();
    expect(screen.getByLabelText('Entwurf verwerfen')).toBeInTheDocument();
  });
});
