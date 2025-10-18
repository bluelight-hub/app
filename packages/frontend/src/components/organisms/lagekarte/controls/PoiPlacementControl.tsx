import { cn } from '@/utils/cn';
import { formatPoiTypeLabel } from '@/utils/formatPoiTypeLabel';
import { POI_ICON_MAP, type PoiType } from '@/utils/poi-icons';
import { Button } from '@atoms/button.atom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import type React from 'react';
import { useState } from 'react';
import { PiCaretDown, PiMapPin, PiX } from 'react-icons/pi';

interface PoiPlacementControlProps {
  /**
   * Callback wenn ein POI-Typ ausgewählt wird
   */
  onPoiTypeSelect: (type: PoiType) => void;

  /**
   * Callback wenn Platzierungs-Modus abgebrochen wird
   */
  onCancel: () => void;

  /**
   * Aktuell ausgewählter POI-Typ (null = kein Platzierungs-Modus aktiv)
   */
  selectedType: PoiType | null;

  /**
   * Ob Platzierungs-Modus aktiv ist
   */
  isPlacementActive: boolean;

  /**
   * Ob POI-Erstellungs-Modal offen ist
   */
  isModalOpen: boolean;
}

/**
 * Moderner POI-Platzierungs-Control im Leaflet-Stil
 *
 * Drei Zustände:
 * 1. Collapsed: Nur "POI platzieren" Button sichtbar
 * 2. Expanded: POI-Kategorien ausgeklappt (User kann wählen)
 * 3. Placement Active: Kategorie gewählt, zeigt "Abbrechen" Button
 *
 * Features:
 * - Glassmorphism Design mit Backdrop-Blur
 * - Smooth Transitions & Animationen
 * - Hover-Effekte mit Scale
 * - Active State mit blauem Glow
 * - Dark-Mode Support
 * - Touch-friendly auf Mobile
 *
 * @example
 * ```tsx
 * <PoiPlacementControl
 *   onPoiTypeSelect={(type) => activatePlacementMode(type)}
 *   onCancel={() => deactivatePlacementMode()}
 *   selectedType={selectedType}
 *   isPlacementActive={isPlacementActive}
 * />
 * ```
 */
export const PoiPlacementControl: React.FC<PoiPlacementControlProps> = ({ onPoiTypeSelect, onCancel, selectedType, isPlacementActive, isModalOpen }) => {
  // UI-State: Ob POI-Kategorien ausgeklappt sind (unabhängig von Platzierungs-Modus)
  const [isExpanded, setIsExpanded] = useState(false);

  // Häufige POI-Typen (Haupt-Buttons)
  const frequentTypes: PoiType[] = ['EINSATZORT', 'FAHRZEUG', 'EINHEIT', 'GEFAHRENQUELLE', 'VERSORGUNGSPUNKT', 'BEREITSTELLUNGSRAUM'];

  // Erweiterte POI-Typen (Dropdown-Menü)
  const extendedTypes: PoiType[] = ['SPERRBEREICH', 'BEHANDLUNGSPLATZ', 'SAMMELSTELLE', 'UNTERKUNFT', 'EINSATZABSCHNITT', 'EINSATZLEITUNG', 'SONSTIGES'];

  /**
   * Handler: User klickt auf "POI platzieren" Button
   */
  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  /**
   * Handler: User wählt POI-Typ aus
   */
  const handlePoiTypeSelect = (type: PoiType) => {
    onPoiTypeSelect(type);
    setIsExpanded(false); // Kategorien ausblenden nach Auswahl
  };

  /**
   * Handler: User klickt "Abbrechen"
   */
  const handleCancel = () => {
    onCancel();
    setIsExpanded(false); // Zurück zu collapsed state
  };

  /**
   * Rendert einen POI-Typ-Button
   */
  const renderPoiButton = (type: PoiType) => {
    const config = POI_ICON_MAP[type];
    const isActive = selectedType === type;

    return (
      <Button
        key={type}
        onClick={() => handlePoiTypeSelect(type)}
        intent={isActive ? 'info' : 'secondary'}
        appearance={isActive ? 'filled' : 'ghost'}
        size="sm"
        fullWidth
        className={cn(
          'justify-start gap-2 text-left',
          // Active state enhancements (blue glow)
          isActive && 'shadow-blue-500/50 shadow-lg ring-2 ring-blue-400 dark:ring-blue-500',
          // Hover scale animation
          'hover:scale-[1.02]',
        )}
        aria-label={`POI-Typ auswählen: ${type}`}
        aria-pressed={isActive}
      >
        {/* Icon */}
        <config.Icon size={20} color={isActive ? '#ffffff' : config.color} aria-hidden="true" />

        {/* Label */}
        <span>{formatPoiTypeLabel(type)}</span>
      </Button>
    );
  };

  // Verstecke Control wenn Modal offen ist
  if (isModalOpen) {
    return null;
  }

  return (
    <>
      {/* Desktop: Im Flex-Container (keine absolute Positionierung) */}
      {/* Glassmorphism Container */}
      <div
        className={cn(
          // Glassmorphism
          'rounded-xl border border-gray-200/50 bg-white/90 shadow-xl backdrop-blur-lg',
          'dark:border-gray-700/50 dark:bg-gray-900/90',
          // Width
          'min-w-[200px]',
          // Transition
          'transition-all duration-300 ease-in-out',
        )}
      >
        {/* Platzierungs-Modus AKTIV: Zeige Abbrechen-Button + Ausgewählte Kategorie */}
        {isPlacementActive && selectedType ? (
          <div className="p-2">
            {/* Abbrechen-Button */}
            <Button
              onClick={handleCancel}
              intent="danger"
              appearance="filled"
              size="sm"
              fullWidth
              className={cn('justify-start gap-2 font-semibold shadow-md hover:scale-[1.02] hover:shadow-lg')}
              aria-label="Platzierung abbrechen"
            >
              <PiX size={20} aria-hidden="true" />
              <span>Abbrechen</span>
            </Button>

            {/* Ausgewählte Kategorie (anzeigen) */}
            <div className="mt-2 rounded-lg border-2 border-blue-500 bg-blue-50 px-3 py-2 dark:border-blue-400 dark:bg-blue-900/50">
              <div className="flex items-center gap-2">
                {(() => {
                  const config = POI_ICON_MAP[selectedType];
                  return (
                    <>
                      <config.Icon size={20} color={config.color} aria-hidden="true" />
                      <span className="font-semibold text-blue-900 text-sm dark:text-blue-100">{formatPoiTypeLabel(selectedType)}</span>
                    </>
                  );
                })()}
              </div>
              <p className="mt-1 text-blue-700 text-xs dark:text-blue-300">Klicke auf die Karte, um zu platzieren</p>
            </div>
          </div>
        ) : (
          <>
            {/* Collapsed State: Nur "POI platzieren" Button */}
            {!isExpanded ? (
              <Button onClick={handleToggleExpand} intent="secondary" size="md" fullWidth aria-label="POI platzieren" aria-expanded={isExpanded}>
                <PiMapPin size={20} aria-hidden="true" />
                <span>POI platzieren</span>
              </Button>
            ) : (
              /* Expanded State: POI-Kategorien */
              <div className="p-2">
                {/* Header mit Schließen-Button */}
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="font-semibold text-gray-900 text-sm dark:text-gray-100">POI-Typ wählen</span>
                  <Button onClick={handleToggleExpand} intent="secondary" appearance="ghost" size="icon" className="p-1" aria-label="Kategorien schließen">
                    <PiX size={18} aria-hidden="true" />
                  </Button>
                </div>

                {/* Häufige POI-Typen */}
                <div className="flex flex-col gap-1">{frequentTypes.map(renderPoiButton)}</div>

                {/* Erweiterte POI-Typen (Dropdown) */}
                <Menu as="div" className="relative mt-2">
                  {({ open }) => (
                    <>
                      <MenuButton
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition-all duration-200',
                          'font-medium text-sm',
                          open
                            ? 'bg-blue-50 text-blue-900 shadow-md ring-2 ring-blue-500 dark:bg-blue-900/50 dark:text-blue-100 dark:ring-blue-400'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                        )}
                        aria-label="Erweiterte POI-Typen"
                      >
                        <span>Erweitert</span>
                        <PiCaretDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
                      </MenuButton>

                      <MenuItems className="absolute top-full left-0 right-0 z-30 mt-1 origin-top-left rounded-lg border border-gray-200 bg-white p-1 shadow-xl transition focus:outline-none dark:border-gray-700 dark:bg-gray-800">
                        {extendedTypes.map((type) => {
                          const config = POI_ICON_MAP[type];
                          const isActive = selectedType === type;

                          return (
                            <MenuItem key={type}>
                              {({ focus }) => (
                                <Button
                                  onClick={() => handlePoiTypeSelect(type)}
                                  intent={isActive ? 'info' : 'secondary'}
                                  appearance="ghost"
                                  size="sm"
                                  fullWidth
                                  className={cn(
                                    'justify-start gap-2 text-left font-medium',
                                    focus && 'bg-gray-50 dark:bg-gray-700',
                                    isActive && 'bg-blue-50 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100',
                                  )}
                                  aria-label={`POI-Typ auswählen: ${type}`}
                                >
                                  <config.Icon size={18} color={config.color} aria-hidden="true" />
                                  <span>{formatPoiTypeLabel(type)}</span>
                                </Button>
                              )}
                            </MenuItem>
                          );
                        })}
                      </MenuItems>
                    </>
                  )}
                </Menu>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile: Bottom Bar */}
      <div className="absolute right-4 bottom-4 left-4 z-[1000] md:hidden">
        {/* Glassmorphism Container */}
        <div
          className={cn(
            // Glassmorphism
            'rounded-xl border border-gray-200/50 bg-white/90 shadow-xl backdrop-blur-lg',
            'dark:border-gray-700/50 dark:bg-gray-900/90',
            // Padding
            'p-3',
          )}
        >
          {/* Platzierungs-Modus AKTIV: Zeige Abbrechen-Button */}
          {isPlacementActive && selectedType ? (
            <div className="flex flex-col gap-2">
              {/* Abbrechen-Button */}
              <Button onClick={handleCancel} intent="danger" appearance="filled" size="md" fullWidth className={cn('gap-2 font-semibold shadow-md')} aria-label="Platzierung abbrechen">
                <PiX size={22} aria-hidden="true" />
                <span>Abbrechen</span>
              </Button>

              {/* Ausgewählte Kategorie */}
              <div className="rounded-lg border-2 border-blue-500 bg-blue-50 px-3 py-2 dark:border-blue-400 dark:bg-blue-900/50">
                <div className="flex items-center justify-center gap-2">
                  {(() => {
                    const config = POI_ICON_MAP[selectedType];
                    return (
                      <>
                        <config.Icon size={22} color={config.color} aria-hidden="true" />
                        <span className="font-semibold text-base text-blue-900 dark:text-blue-100">{formatPoiTypeLabel(selectedType)}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            /* Compact Menu für alle POI-Typen auf Mobile */
            <Menu as="div" className="relative w-full">
              {({ open }) => (
                <>
                  <MenuButton
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 transition-all duration-200',
                      open ? 'bg-blue-500 font-semibold text-white shadow-lg' : 'bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-lg hover:from-blue-600 hover:to-blue-700',
                    )}
                    aria-label="POI platzieren"
                  >
                    <PiMapPin size={22} aria-hidden="true" />
                    <span className="text-base">{selectedType ? formatPoiTypeLabel(selectedType) : 'POI platzieren'}</span>
                    <PiCaretDown className={cn('h-5 w-5 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
                  </MenuButton>

                  <MenuItems className="absolute right-0 bottom-full left-0 z-50 mb-2 max-h-72 origin-bottom overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-xl transition focus:outline-none dark:border-gray-700 dark:bg-gray-800">
                    {/* Alle POI-Typen (häufig + erweitert) auf Mobile */}
                    {[...frequentTypes, ...extendedTypes].map((type) => {
                      const config = POI_ICON_MAP[type];
                      const isActive = selectedType === type;

                      return (
                        <MenuItem key={type}>
                          {({ focus }) => (
                            <button
                              type="button"
                              onClick={() => handlePoiTypeSelect(type)}
                              className={cn(
                                'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all duration-200',
                                'font-medium text-base',
                                focus && 'bg-gray-50 dark:bg-gray-700',
                                isActive && 'bg-blue-50 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100',
                              )}
                              aria-label={`POI-Typ auswählen: ${type}`}
                            >
                              <config.Icon size={24} color={config.color} aria-hidden="true" />
                              <span>{formatPoiTypeLabel(type)}</span>
                            </button>
                          )}
                        </MenuItem>
                      );
                    })}
                  </MenuItems>
                </>
              )}
            </Menu>
          )}
        </div>
      </div>
    </>
  );
};
