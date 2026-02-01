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
  if (!farbe) return 'bg-gray-100';
  const match = farbe.match(/bg-\w+-\d+/);
  return match ? match[0] : 'bg-gray-100';
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
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          // Aktiver Filter: Primary-Farben
          hasActiveFilter
            ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-300'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
        )}
      >
        <PiFunnel className={cn('h-4 w-4 flex-shrink-0', hasActiveFilter ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')} aria-hidden="true" />
        <span className="block truncate font-medium">{buttonLabel}</span>
        <PiCaretDown className={cn('ml-auto h-4 w-4 flex-shrink-0', hasActiveFilter ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')} aria-hidden="true" />
      </PopoverButton>

      <PopoverPanel
        transition
        className={cn(
          'absolute z-20 mt-1 w-64 rounded-lg bg-white py-2 shadow-lg',
          'border border-gray-200',
          'ring-1 ring-black ring-opacity-5 focus:outline-none',
          'transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0',
          'dark:border-gray-700 dark:bg-gray-800',
        )}
      >
        {/* Quick Actions */}
        <div className="mb-2 flex flex-wrap gap-2 border-gray-200 border-b px-3 pb-2 dark:border-gray-700">
          <button
            type="button"
            onClick={showAllKategorien}
            className={cn('flex items-center gap-1 rounded px-2 py-1 font-medium text-xs', 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700')}
          >
            <PiEye className="h-3.5 w-3.5" />
            Alle
          </button>
          <button
            type="button"
            onClick={hideAllKategorien}
            className={cn('flex items-center gap-1 rounded px-2 py-1 font-medium text-xs', 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700')}
          >
            <PiProhibit className="h-3.5 w-3.5" />
            Keine
          </button>
          <button
            type="button"
            onClick={resetKategorieFilter}
            className={cn('flex items-center gap-1 rounded px-2 py-1 font-medium text-xs', 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700')}
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
                  isVisible ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500',
                  'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                )}
              >
                {/* Checkbox */}
                <span
                  className={cn(
                    'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                    isVisible ? 'border-primary-500 bg-primary-500 text-white dark:border-primary-400 dark:bg-primary-500' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700',
                  )}
                >
                  {isVisible && <PiCheck className="h-3 w-3" />}
                </span>

                {/* Farb-Punkt */}
                <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', isVisible ? bgColor : 'bg-gray-200 dark:bg-gray-600')} />

                {/* Label */}
                <span className={cn('truncate', isVisible ? 'font-medium' : 'font-normal')}>{kategorieLabels[kategorie]}</span>

                {/* Ausgeblendet-Icon */}
                {!isVisible && <PiEyeSlash className="ml-auto h-3.5 w-3.5 text-gray-400" />}
              </button>
            );
          })}

          {/* Separator */}
          <div className="my-2 border-gray-200 border-t dark:border-gray-700" />

          {/* Spezieller Filter: Mit Erinnerung */}
          <button
            type="button"
            onClick={toggleErinnerungFilter}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
              'transition-colors duration-100',
              'hover:bg-gray-50 dark:hover:bg-gray-700/50',
              erinnerungFilterActive ? 'bg-amber-50/50 text-gray-900 dark:bg-amber-900/20 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400',
            )}
          >
            {/* Checkbox */}
            <span
              className={cn(
                'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                erinnerungFilterActive ? 'border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-500' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700',
              )}
            >
              {erinnerungFilterActive && <PiCheck className="h-3 w-3" />}
            </span>

            {/* Bell Icon */}
            <PiBell className={cn('h-4 w-4 flex-shrink-0', erinnerungFilterActive ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500')} />

            {/* Label */}
            <span className={cn('truncate', erinnerungFilterActive ? 'font-medium' : 'font-normal')}>Mit Erinnerung</span>
          </button>
        </div>
      </PopoverPanel>
    </Popover>
  );
}
