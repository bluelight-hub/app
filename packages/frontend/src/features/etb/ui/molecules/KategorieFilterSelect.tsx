/**
 * KategorieFilterSelect Komponente fuer ETB-Kategoriefilterung
 *
 * Multiselect-Dropdown zur Filterung der ETB-Eintraege nach Kategorie.
 * Nutzt Exclude-Logik: Ausgewaehlte Kategorien werden AUSGEBLENDET.
 *
 * **Story 5.6:** ETB-Filter nach Kategorie (Multiselect)
 * - AC1: Filter-Dropdown mit allen 14 Kategorien
 * - AC2: Visuelles Feedback bei aktivem Filter
 * - AC3: Standard: SYSTEM ausgeblendet
 * - AC4: "Keine" Filter blendet alle Kategorien aus
 * - AC5: "Mit Erinnerung" Filter zeigt nur Eintraege mit verknuepfter Erinnerung
 */

import { cn } from '@/shared/ui/cn';
import type { EintragDtoKategorieEnum as EtbKategorie } from '@/shared';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useMemo } from 'react';
import { PiBell, PiCaretDown, PiCheck, PiEye, PiEyeSlash, PiFunnel, PiProhibit } from 'react-icons/pi';
import { kategorieFarben } from '../../constants/kategorie.constants';
import {
  ALLE_KATEGORIEN,
  toggleKategorie,
  showAllKategorien,
  resetKategorieFilter,
  hideAllKategorien,
  toggleErinnerungFilter,
  useExcludedKategorien,
  useHasActiveFilter,
  useErinnerungFilterActive,
} from '../../stores';

/**
 * Deutsche Anzeige-Labels fuer alle Kategorien
 */
const kategorieLabels: Record<EtbKategorie, string> = {
  ALARMIERUNG: 'Alarmierung',
  ANKUNFT: 'Ankunft',
  BEFEHL: 'Befehl',
  ERKUNDUNG: 'Erkundung',
  LAGE: 'Lage',
  MASSNAHME: 'Massnahme',
  PERSONAL: 'Personal',
  FAHRZEUG: 'Fahrzeug',
  MATERIAL: 'Material',
  KOMMUNIKATION: 'Kommunikation',
  WETTER: 'Wetter',
  DOKUMENTATION: 'Dokumentation',
  SONSTIGES: 'Sonstiges',
  SYSTEM: 'System',
} as Record<EtbKategorie, string>;

/**
 * Hilfsfunktion um die Hintergrundfarbe aus den kategorieFarben zu extrahieren
 */
function extractBgColor(farbe: string | undefined): string {
  if (!farbe) return 'bg-surface-raised';
  const match = farbe.match(/\bbg-[^\s]+/);
  return match ? match[0] : 'bg-surface-raised';
}

/**
 * KategorieFilterSelect - Multiselect zur Filterung von ETB-Eintraegen nach Kategorie
 *
 * Nutzt Exclude-Logik: Kategorien mit Haken sind SICHTBAR, ohne Haken AUSGEBLENDET.
 * Standard: SYSTEM ist ausgeblendet.
 */
export function KategorieFilterSelect() {
  const excludedKategorien = useExcludedKategorien();
  const hasActiveFilter = useHasActiveFilter();
  const erinnerungFilterActive = useErinnerungFilterActive();

  /** Anzahl der sichtbaren Kategorien */
  const visibleCount = useMemo(() => ALLE_KATEGORIEN.length - excludedKategorien.size, [excludedKategorien]);

  /** Button-Label */
  const buttonLabel = useMemo(() => {
    if (erinnerungFilterActive) return 'Mit Erinnerung';
    if (excludedKategorien.size === 0) return 'Alle Kategorien';
    if (excludedKategorien.size === ALLE_KATEGORIEN.length) return 'Keine Kategorie';
    return `${visibleCount} von ${ALLE_KATEGORIEN.length}`;
  }, [excludedKategorien.size, visibleCount, erinnerungFilterActive]);

  return (
    <Popover className="relative">
      <PopoverButton
        className={cn(
          'relative flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:shadow-focus-ring',
          hasActiveFilter ? 'border-action-primary bg-action-secondary text-action-primary' : 'border-border-subtle bg-surface-panel text-text-secondary hover:bg-action-secondary',
        )}
      >
        <PiFunnel className={cn('h-4 w-4 flex-shrink-0', hasActiveFilter ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
        <span className="block truncate font-medium">{buttonLabel}</span>
        <PiCaretDown className={cn('ml-auto h-4 w-4 flex-shrink-0', hasActiveFilter ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
      </PopoverButton>

      <PopoverPanel
        transition
        className={cn(
          'absolute z-20 mt-1 w-64 rounded-lg bg-surface-panel py-2 shadow-lg',
          'border border-border-subtle',
          'ring-1 ring-border-subtle/50 focus-visible:outline-none',
          'transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0',
        )}
      >
        {/* Quick Actions */}
        <div className="mb-2 flex flex-wrap gap-2 border-border-subtle border-b px-3 pb-2">
          <button
            type="button"
            onClick={showAllKategorien}
            className={cn('flex items-center gap-1 rounded px-2 py-1 font-medium text-xs text-text-secondary hover:bg-action-secondary', 'focus-visible:outline-none focus-visible:shadow-focus-ring')}
          >
            <PiEye className="h-3.5 w-3.5" />
            Alle
          </button>
          <button
            type="button"
            onClick={hideAllKategorien}
            className={cn('flex items-center gap-1 rounded px-2 py-1 font-medium text-xs text-text-secondary hover:bg-action-secondary', 'focus-visible:outline-none focus-visible:shadow-focus-ring')}
          >
            <PiProhibit className="h-3.5 w-3.5" />
            Keine
          </button>
          <button
            type="button"
            onClick={resetKategorieFilter}
            className={cn('flex items-center gap-1 rounded px-2 py-1 font-medium text-xs text-text-secondary hover:bg-action-secondary', 'focus-visible:outline-none focus-visible:shadow-focus-ring')}
          >
            <PiFunnel className="h-3.5 w-3.5" />
            Standard
          </button>
        </div>

        {/* Kategorien-Liste */}
        <div className="max-h-72 overflow-y-auto px-1">
          {ALLE_KATEGORIEN.map((kategorie) => {
            const isVisible = !excludedKategorien.has(kategorie);
            const farbe = kategorieFarben[kategorie];
            const bgColor = extractBgColor(farbe);

            return (
              <button
                key={kategorie}
                type="button"
                onClick={() => toggleKategorie(kategorie)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                  'transition-colors duration-100',
                  'hover:bg-action-secondary',
                  isVisible ? 'text-text-primary' : 'text-text-muted',
                  'focus-visible:outline-none focus-visible:shadow-focus-ring',
                )}
              >
                {/* Checkbox */}
                <span
                  className={cn(
                    'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                    isVisible ? 'border-action-primary bg-action-primary text-text-inverse' : 'border-border-subtle bg-surface-panel',
                  )}
                >
                  {isVisible && <PiCheck className="h-3 w-3" />}
                </span>

                {/* Farb-Punkt */}
                <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', isVisible ? bgColor : 'bg-border-subtle')} />

                {/* Label */}
                <span className={cn('truncate', isVisible ? 'font-medium' : 'font-normal')}>{kategorieLabels[kategorie]}</span>

                {/* Ausgeblendet-Icon */}
                {!isVisible && <PiEyeSlash className="ml-auto h-3.5 w-3.5 text-text-muted" />}
              </button>
            );
          })}

          {/* Separator */}
          <div className="my-2 border-border-subtle border-t" />

          {/* Spezieller Filter: Mit Erinnerung */}
          <button
            type="button"
            onClick={toggleErinnerungFilter}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
              'transition-colors duration-100',
              'hover:bg-action-secondary',
              erinnerungFilterActive ? 'bg-status-warning-surface text-status-warning-text' : 'text-text-secondary',
              'focus-visible:outline-none focus-visible:shadow-focus-ring',
            )}
          >
            {/* Checkbox */}
            <span
              className={cn(
                'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                erinnerungFilterActive ? 'border-status-warning-border bg-status-warning-text text-text-inverse' : 'border-border-subtle bg-surface-panel',
              )}
            >
              {erinnerungFilterActive && <PiCheck className="h-3 w-3" />}
            </span>

            {/* Bell Icon */}
            <PiBell className={cn('h-4 w-4 flex-shrink-0', erinnerungFilterActive ? 'text-status-warning-text' : 'text-text-muted')} />

            {/* Label */}
            <span className={cn('truncate', erinnerungFilterActive ? 'font-medium' : 'font-normal')}>Mit Erinnerung</span>
          </button>
        </div>
      </PopoverPanel>
    </Popover>
  );
}
