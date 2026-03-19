import { EtbFullscreenView, EtbComposerWorkspace } from '@/features/etb';

type EtbPageProps = {
  einsatzId: string;
  mode: 'standard' | 'fullscreen';
};

/**
 * ETB-Seite — Delegiert an EtbComposerWorkspace (Standard) oder EtbFullscreenView
 *
 * Zeigt das Einsatztagebuch für einen spezifischen Einsatz an.
 */
export function EtbPage({ einsatzId, mode }: EtbPageProps) {
  if (mode === 'fullscreen') {
    return <EtbFullscreenView einsatzId={einsatzId} sortOrder="desc" showDeleted={false} />;
  }

  return <EtbComposerWorkspace einsatzId={einsatzId} />;
}
