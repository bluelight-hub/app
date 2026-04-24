/**
 * GefaehrdungsbeurteilungHistoriePopover — Versions-Timeline als Popover
 * (Story 415-2-4, Task 11, AC2, AC12).
 *
 * Rendert einen Headless-UI-`Popover`, dessen `PopoverButton` das vom Parent
 * gelieferte `trigger`-Element (meist ein `VersionTimestampFooter`) wrappt.
 * Im geöffneten Zustand wird die Versionshistorie des Aggregats als
 * `role="listbox"` gerendert — jede Zeile repräsentiert eine Version mit
 * Versionsnummer, Zeitstempel, Bearbeiter-Name und einem Diff-Stichwort.
 *
 * **Lazy-Loading (AC12):** Die Historie-Liste wird nur gerendert, solange
 * der Popover offen ist. Damit entsteht die Query erst beim Öffnen, nicht
 * im initialen Page-Render.
 *
 * **Keyboard-Navigation:**
 * - Arrow-Down / Arrow-Up wandert durch die Versionen (Roving-TabIndex).
 * - Enter / Space auf einer Zeile → `onSelectVersion(entry)` + Popover schließt.
 * - Escape schließt den Popover (Headless-UI-default).
 *
 * **Error- / Empty-Handling (AC12 + UX-DR21 Zero-Toast):**
 * - Loading: 3 animierte Skeleton-Zeilen.
 * - Error: inline `<div role="alert">` mit deutschem Fehlertext.
 * - Empty (defensive — Backend liefert normalerweise mind. V1): „Keine
 *   Versionen verfügbar" ohne listbox.
 *
 * **Aktuelle Version:** `entry.gueltigBis === null` markiert die aktuell
 * gültige Version (canonisch aus der Backend-Semantik; synonym zu
 * `entry.version === aggregateVersion`). Sie trägt `aria-current="true"`
 * und einen visuellen „Aktuell"-Badge.
 */

import { cn } from '@/shared/ui/cn';
import { useGefaehrdungsbeurteilungHistorie } from '@/features/eigenschutz/api/queries';
import { formatChangedFieldsSummary } from '@/features/eigenschutz/utils/version-summary';
import type { GefaehrdungsbeurteilungHistorieEintrag } from '@bluelight-hub/shared/schemas';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { cloneElement, useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';

export interface GefaehrdungsbeurteilungHistoriePopoverProps {
  readonly einsatzId: string;
  readonly gefaehrdungsbeurteilungId: string;
  readonly popoverId: string;
  readonly trigger: ReactElement<{ isOpen?: boolean; popoverId?: string }>;
  readonly onSelectVersion: (entry: GefaehrdungsbeurteilungHistorieEintrag) => void;
}

/**
 * Formatiert einen ISO-Zeitstempel als „DD.MM.YYYY HH:mm" in deutscher
 * Schreibweise. Bei ungültigem Input fällt die Ausgabe auf einen Dash
 * zurück, damit die Zeile nicht leer ist.
 */
function formatFullTimestamp(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Liefert den Anzeige-Namen für eine Historie-Zeile. Bevorzugt der
 * Backend-resolved `changedByUserName`; Fallback ist die UserId-
 * Kurzform (letzte 8 Zeichen), wenn der Name `null` ist (z. B. User
 * gelöscht).
 */
function resolveDisplayName(entry: GefaehrdungsbeurteilungHistorieEintrag): string {
  if (entry.changedByUserName) return entry.changedByUserName;
  return entry.changedByUserId.length <= 8 ? entry.changedByUserId : entry.changedByUserId.slice(-8);
}

interface HistorieListProps {
  readonly einsatzId: string;
  readonly gefaehrdungsbeurteilungId: string;
  readonly onSelectVersion: (entry: GefaehrdungsbeurteilungHistorieEintrag) => void;
  readonly onClose: () => void;
}

function HistorieList({ einsatzId, gefaehrdungsbeurteilungId, onSelectVersion, onClose }: HistorieListProps) {
  const query = useGefaehrdungsbeurteilungHistorie(einsatzId, gefaehrdungsbeurteilungId);
  const [focusIndex, setFocusIndex] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);
  const eintraege = query.data?.eintraege ?? [];

  // Fokus auf die aktuell aktive Zeile setzen, wenn sich `focusIndex` ändert —
  // Keyboard-Nav soll den Fokus mitführen (Roving-TabIndex-Pattern).
  useEffect(() => {
    if (eintraege.length === 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-option-index="${focusIndex}"]`);
    el?.focus();
  }, [eintraege.length, focusIndex]);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2 p-3" data-testid="historie-popover-loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 w-full animate-pulse rounded-control bg-action-secondary/60" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="p-3 text-sm text-status-danger-text" data-testid="historie-popover-error">
        Historie konnte nicht geladen werden
      </div>
    );
  }

  if (eintraege.length === 0) {
    return (
      <div className="p-3 text-sm text-text-muted" data-testid="historie-popover-empty">
        Keine Versionen verfügbar
      </div>
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLLIElement>, index: number, entry: GefaehrdungsbeurteilungHistorieEintrag) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusIndex((current) => Math.min(current + 1, eintraege.length - 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        setFocusIndex((current) => Math.max(current - 1, 0));
        return;
      case 'Home':
        event.preventDefault();
        setFocusIndex(0);
        return;
      case 'End':
        event.preventDefault();
        setFocusIndex(eintraege.length - 1);
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelectVersion(entry);
        onClose();
        return;
      default:
        // Escape wird von Headless-UI behandelt (default Popover-Verhalten).
        // Rückgabe ohne preventDefault — andere Tasten (z. B. Tab) bleiben aktiv.
        return;
    }
  }

  return (
    <ul ref={listRef} role="listbox" aria-label="Versionshistorie" className="max-h-80 overflow-y-auto py-1" data-testid="historie-popover-list">
      {eintraege.map((entry, index) => {
        const isCurrent = entry.gueltigBis === null;
        const isFocused = focusIndex === index;
        return (
          <li
            key={entry.version}
            role="option"
            aria-selected={isFocused}
            aria-current={isCurrent ? 'true' : undefined}
            tabIndex={isFocused ? 0 : -1}
            data-option-index={index}
            data-testid={`historie-popover-option-${entry.version}`}
            onClick={() => {
              onSelectVersion(entry);
              onClose();
            }}
            onKeyDown={(event) => handleKeyDown(event, index, entry)}
            onFocus={() => setFocusIndex(index)}
            className={cn(
              'flex cursor-pointer flex-col gap-1 border-b border-border-subtle px-3 py-2 text-sm last:border-b-0',
              'focus:outline-none focus-visible:shadow-focus-ring',
              isFocused ? 'bg-action-secondary' : 'hover:bg-action-secondary/60',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-text-primary">V{entry.version}</span>
              {isCurrent ? (
                <span
                  className="inline-flex items-center rounded-control bg-action-primary/10 px-2 py-0.5 text-xs font-semibold text-action-primary"
                  data-testid={`historie-popover-current-${entry.version}`}
                >
                  Aktuell
                </span>
              ) : null}
            </div>
            <div className="text-xs text-text-muted">{formatFullTimestamp(entry.gueltigVon)}</div>
            <div className="text-xs text-text-secondary">{resolveDisplayName(entry)}</div>
            <div className="text-xs text-text-muted">{formatChangedFieldsSummary(entry.changedFields)}</div>
          </li>
        );
      })}
    </ul>
  );
}

export function GefaehrdungsbeurteilungHistoriePopover({ einsatzId, gefaehrdungsbeurteilungId, popoverId, trigger, onSelectVersion }: GefaehrdungsbeurteilungHistoriePopoverProps) {
  return (
    <Popover className="relative">
      {({ open, close }) => {
        const wiredTrigger = typeof trigger.type === 'string' ? trigger : cloneElement(trigger, { isOpen: open, popoverId });
        return (
          <>
            {/* `as={Fragment}` würde den Trigger direkt als Button rendern; wir
              wrappen stattdessen mit einem span-`PopoverButton`, damit der
              Parent freie Wahl beim Trigger-Element hat (z. B. der
              `VersionTimestampFooter`, der selbst ein `<button>` ist). */}
            <PopoverButton as="span" data-testid="historie-popover-trigger">
              {wiredTrigger}
            </PopoverButton>
            <PopoverPanel
              id={popoverId}
              transition
              anchor={{ to: 'top start', gap: 4 }}
              className={cn(
                'z-30 w-80 rounded-panel border border-border-subtle bg-surface-panel shadow-panel',
                'ring-1 ring-border-subtle/50 focus:outline-none',
                'transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0',
              )}
              data-testid="historie-popover-panel"
            >
              <HistorieList einsatzId={einsatzId} gefaehrdungsbeurteilungId={gefaehrdungsbeurteilungId} onSelectVersion={onSelectVersion} onClose={close} />
            </PopoverPanel>
          </>
        );
      }}
    </Popover>
  );
}
