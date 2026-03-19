/**
 * EtbPage Composer-Delegation Tests
 *
 * Prüft, dass EtbPage korrekt an EtbComposerWorkspace (Standard-Modus)
 * bzw. EtbFullscreenView (Fullscreen-Modus) delegiert.
 * Keine Performance-Tests — reine Routing-/Delegations-Logik.
 */
import { renderWithProviders, screen } from '@/test/utils';
import { describe, expect, it, vi } from 'vitest';
import { EtbPage } from '../EtbPage';

vi.mock('@/features/etb', async () => {
  return {
    EtbComposerWorkspace: ({ einsatzId }: { einsatzId: string }) => <div data-testid="etb-composer-workspace" data-einsatz-id={einsatzId} />,
    EtbFullscreenView: ({ einsatzId }: { einsatzId: string }) => <div data-testid="etb-fullscreen-view" data-einsatz-id={einsatzId} />,
  };
});

describe('EtbPage - Composer-Delegation', () => {
  it('delegiert Standard-Modus an EtbComposerWorkspace', () => {
    renderWithProviders(<EtbPage einsatzId="einsatz-1" mode="standard" />);
    const workspace = screen.getByTestId('etb-composer-workspace');
    expect(workspace).toBeInTheDocument();
    expect(workspace).toHaveAttribute('data-einsatz-id', 'einsatz-1');
  });

  it('delegiert Fullscreen-Modus an EtbFullscreenView', () => {
    renderWithProviders(<EtbPage einsatzId="einsatz-1" mode="fullscreen" />);
    const fullscreen = screen.getByTestId('etb-fullscreen-view');
    expect(fullscreen).toBeInTheDocument();
    expect(fullscreen).toHaveAttribute('data-einsatz-id', 'einsatz-1');
  });
});
