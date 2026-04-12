import { useMemo } from 'react';

import { cn } from '@/shared/ui/cn';

import type { ZeichenDefinition } from './renderer';
import { renderer } from './phjardas-adapter';

interface ZeichenPreviewProps {
  /** Definition des darzustellenden taktischen Zeichens. */
  definition: ZeichenDefinition;
  /** Darstellungsgröße: sm = 32px, md = 48px, lg = 128px. Standard: md. */
  size?: 'sm' | 'md' | 'lg';
  /** Zusätzliche CSS-Klassen. */
  className?: string;
}

const SIZE_MAP = { sm: 32, md: 48, lg: 128 } as const;

/**
 * Zeigt eine Vorschau eines taktischen Zeichens an.
 * Wird in Listen (sm), Katalogen (md) und der Builder-Vorschau (lg) eingesetzt.
 */
export function ZeichenPreview({ definition, size = 'md', className }: ZeichenPreviewProps) {
  const dataUrl = useMemo(() => renderer.renderDataUrl(definition), [definition]);
  const px = SIZE_MAP[size];

  return <img src={dataUrl} alt={`Taktisches Zeichen: ${definition.grundzeichen ?? 'unbekannt'}`} width={px} height={px} className={cn('object-contain', className)} />;
}
