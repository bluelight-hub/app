import { EtbFullscreenView, EtbComposerWorkspace } from '@/features/etb';

type EtbPageProps = {
  einsatzId: string;
  mode: 'standard' | 'fullscreen';
  /** Story 5.5: Sekundaere Rollen sehen ETB read-only */
  readOnly?: boolean;
};

/**
 * ETB-Seite — Delegiert an EtbComposerWorkspace (Standard) oder EtbFullscreenView
 *
 * Zeigt das Einsatztagebuch für einen spezifischen Einsatz an.
 */
export function EtbPage({ einsatzId, mode, readOnly = false }: EtbPageProps) {
  if (mode === 'fullscreen') {
    return <EtbFullscreenView einsatzId={einsatzId} sortOrder="desc" showDeleted={false} />;
  }

  return <EtbComposerWorkspace einsatzId={einsatzId} readOnly={readOnly} />;
}
