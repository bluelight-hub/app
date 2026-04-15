/**
 * FunkKontextBadge
 *
 * Kompakte Darstellung eines Funkspruch-Kontexts: Kanalname + Priorität.
 * Wird in FunkspruchBubble und CompactRow gezeigt und ist verlinkbar mit
 * dem Kanalplan (via `onClick`).
 */

import { cn } from '@/shared/ui/cn';
import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import type { ButtonHTMLAttributes } from 'react';
import type { FunkPrioritaetFilter } from '../../stores/funkprotokoll-filter.store';
import { FunkPrioritaetBadge } from '../atoms/FunkPrioritaetBadge.atom';

export interface FunkKontextBadgeProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Referenzierter Kanal; `undefined`, wenn der Kanal zwischenzeitlich gelöscht wurde. */
  kanal?: Pick<FunkkanalResponseDto, 'id' | 'name'>;
  prioritaet: FunkPrioritaetFilter;
  /**
   * Wenn `true`, wird als inline-Span statt Button gerendert (z. B. in
   * nicht-interaktiven Kontexten wie Druckansichten).
   */
  asSpan?: boolean;
}

export function FunkKontextBadge({ kanal, prioritaet, asSpan = false, className, ...rest }: FunkKontextBadgeProps) {
  const kanalLabel = kanal?.name ?? 'Kanal (gelöscht)';
  const content = (
    <>
      <span className={cn('font-medium', !kanal && 'text-zinc-400 italic')}>{kanalLabel}</span>
      <FunkPrioritaetBadge prioritaet={prioritaet} size="sm" iconOnly />
    </>
  );

  if (asSpan) {
    return <span className={cn('inline-flex items-center gap-1.5 text-xs', className)}>{content}</span>;
  }

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
        className,
      )}
      {...rest}
    >
      {content}
    </button>
  );
}
