/**
 * FunkprotokollView
 *
 * Virtualisierte Liste der Funksprüche (ETB-Einträge mit FunkKontext).
 * Unterstützt zwei Dichte-Modi (Bubbles / Kompakt) und Auto-Scroll-
 * Verhalten: solange der Nutzer am unteren Ende ist, wird bei neuen
 * Einträgen automatisch nach unten gescrollt; sonst erscheint ein
 * Badge „X neue Nachrichten", das beim Klick nach unten springt.
 */

import { useDichteMode } from '@/features/funkverkehr/hooks/use-dichte-mode';
import { useFunkprotokollEintraege } from '@/features/funkverkehr/hooks/use-funkprotokoll-eintraege';
import { FunkspruchBubble } from '@/features/funkverkehr/ui/molecules/FunkspruchBubble.molecule';
import { FunkspruchCompactRow } from '@/features/funkverkehr/ui/molecules/FunkspruchCompactRow.molecule';
import { cn } from '@/shared/ui/cn';
import type { EintragDto, FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PiArrowDown, PiQueue, PiChatText } from 'react-icons/pi';

export interface FunkprotokollViewProps {
  einsatzId: string;
  kanaele: FunkkanalResponseDto[];
  className?: string;
}

const BOTTOM_THRESHOLD_PX = 80;

type FunkEintrag = EintragDto & { kontext: { type: 'funkspruch'; kanalId: string; funkPrioritaet: 'routine' | 'prioritaet' | 'notfall' } };

export function FunkprotokollView({ einsatzId, kanaele, className }: FunkprotokollViewProps) {
  const { eintraege, isLoading, isError } = useFunkprotokollEintraege({ einsatzId });
  const { dichteMode, toggleDichteMode } = useDichteMode(einsatzId);

  const funkEintraege = useMemo(() => eintraege.filter((e): e is FunkEintrag => (e.kontext as { type?: string } | undefined)?.type === 'funkspruch'), [eintraege]);

  // Chronologisch aufsteigend (älteste oben, neueste unten) — Chat-typisch.
  const sorted = useMemo(() => [...funkEintraege].sort((a, b) => new Date(a.ereignisZeitpunkt).getTime() - new Date(b.ereignisZeitpunkt).getTime()), [funkEintraege]);

  const kanalLookup = useMemo(() => {
    const m = new Map<string, FunkkanalResponseDto>();
    for (const k of kanaele) m.set(k.id, k);
    return m;
  }, [kanaele]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const prevCountRef = useRef(0);

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (dichteMode === 'kompakt' ? 28 : 96),
    overscan: 10,
    useFlushSync: false,
  });

  const updateIsNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    setIsNearBottom(distanceFromBottom <= BOTTOM_THRESHOLD_PX);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setUnseenCount(0);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => updateIsNearBottom();
    el.addEventListener('scroll', handler, { passive: true });
    updateIsNearBottom();
    return () => el.removeEventListener('scroll', handler);
  }, [updateIsNearBottom]);

  // Bei neuem Eintrag: entweder Auto-Scroll oder Badge updaten.
  useLayoutEffect(() => {
    const prev = prevCountRef.current;
    const delta = sorted.length - prev;
    prevCountRef.current = sorted.length;
    if (delta <= 0) return;
    if (isNearBottom) {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } else {
      setUnseenCount((current) => current + delta);
    }
  }, [isNearBottom, sorted.length]);

  if (isError) {
    return (
      <div className={cn('flex h-full items-center justify-center p-8 text-sm text-red-600', className)} role="alert">
        Funkprotokoll konnte nicht geladen werden.
      </div>
    );
  }

  return (
    <section className={cn('relative flex h-full min-h-0 flex-col', className)} aria-label="Funkprotokoll">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-xs text-slate-500">{sorted.length} Einträge</div>
        <button
          type="button"
          onClick={toggleDichteMode}
          className="inline-flex items-center gap-2 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label={`Auf ${dichteMode === 'bubbles' ? 'Kompakt' : 'Bubbles'} umschalten`}
        >
          {dichteMode === 'bubbles' ? <PiQueue className="h-3.5 w-3.5" aria-hidden="true" /> : <PiChatText className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>{dichteMode === 'bubbles' ? 'Kompakt' : 'Bubbles'}</span>
        </button>
      </header>

      <div ref={scrollRef} className="relative flex-1 overflow-auto px-2 py-2" aria-busy={isLoading} role="log" aria-live="polite">
        {sorted.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">{isLoading ? 'Lade Funksprüche…' : 'Noch keine Funksprüche.'}</div>
        ) : (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const eintrag = sorted[virtualRow.index];
              const kanal = kanalLookup.get(eintrag.kontext.kanalId);
              return (
                <div
                  key={eintrag.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
                >
                  {dichteMode === 'bubbles' ? <FunkspruchBubble eintrag={eintrag} kanal={kanal} /> : <FunkspruchCompactRow eintrag={eintrag} kanal={kanal} />}
                </div>
              );
            })}
          </div>
        )}

        {!isNearBottom && unseenCount > 0 && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
            aria-live="polite"
          >
            <PiArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            {unseenCount} neue Nachricht{unseenCount === 1 ? '' : 'en'}
          </button>
        )}

        {!isNearBottom && unseenCount === 0 && <div className="absolute right-4 bottom-4 rounded-full bg-slate-700/90 px-3 py-1 text-[11px] font-medium text-white">Auto-Scroll pausiert</div>}
      </div>
    </section>
  );
}
