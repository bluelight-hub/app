import { cn } from '@/shared/ui/cn';
import { formatPoiTypeLabel } from '@/features/lagekarte/utils';
import { POI_ICON_MAP, type PoiCategory, type PoiType } from '@/features/lagekarte/utils';
import { Button } from '@/shared/ui/atoms/button.atom';
import { PoiTypeButton } from '@/shared/ui/atoms/poi-type-button.atom';
import { PoiTypeDropdown } from '@/shared/ui/molecules/poi-type-dropdown.molecule';
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

  // Häufige POI-Typen (Haupt-Buttons) - neue CQRS-Kategorien (DRK-Standard)
  const frequentTypes: PoiCategory[] = ['EINSATZSTELLE', 'BEREITSTELLUNGSRAUM', 'GEFAHRENSTELLE', 'WASSERENTNAHMESTELLE', 'SONSTIGES'];

  // Erweiterte POI-Typen (Dropdown-Menü) - aktuell leer, da alle 5 DRK-Kategorien als frequent definiert sind
  const extendedTypes: PoiCategory[] = [];

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
          'rounded-xl border border-border-subtle/50 bg-surface-panel/90 shadow-xl backdrop-blur-lg',
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
            <div className="mt-2 rounded-lg border-2 border-status-info-border bg-status-info-surface px-3 py-2">
              <div className="flex items-center gap-2">
                {(() => {
                  const config = POI_ICON_MAP[selectedType];
                  return (
                    <>
                      <config.Icon size={20} color={config.color} aria-hidden="true" />
                      <span className="text-sm font-semibold text-status-info-text">{formatPoiTypeLabel(selectedType)}</span>
                    </>
                  );
                })()}
              </div>
              <p className="mt-1 text-body-xs text-status-info-text">Klicke auf die Karte, um zu platzieren</p>
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
                  <span className="text-sm font-semibold text-text-primary">POI-Typ wählen</span>
                  <Button onClick={handleToggleExpand} intent="secondary" appearance="ghost" size="icon" className="p-1" aria-label="Kategorien schließen">
                    <PiX size={18} aria-hidden="true" />
                  </Button>
                </div>

                {/* Häufige POI-Typen */}
                <div className="flex flex-col gap-1">
                  {frequentTypes.map((type) => (
                    <PoiTypeButton key={type} type={type} onClick={handlePoiTypeSelect} isActive={selectedType === type} size="sm" iconSize={20} fullWidth />
                  ))}
                </div>

                {/* Erweiterte POI-Typen (Dropdown) */}
                <PoiTypeDropdown types={extendedTypes} onSelect={handlePoiTypeSelect} selectedType={selectedType} label="Erweitert" className="mt-2" iconSize={18} />
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
            'rounded-xl border border-border-subtle/50 bg-surface-panel/90 shadow-xl backdrop-blur-lg',
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
              <div className="rounded-lg border-2 border-status-info-border bg-status-info-surface px-3 py-2">
                <div className="flex items-center justify-center gap-2">
                  {(() => {
                    const config = POI_ICON_MAP[selectedType];
                    return (
                      <>
                        <config.Icon size={22} color={config.color} aria-hidden="true" />
                        <span className="text-base font-semibold text-status-info-text">{formatPoiTypeLabel(selectedType)}</span>
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
                      open ? 'bg-action-primary font-semibold text-text-inverse shadow-lg' : 'bg-action-primary font-semibold text-text-inverse shadow-lg hover:bg-action-primary-hover',
                    )}
                    aria-label="POI platzieren"
                  >
                    <PiMapPin size={22} aria-hidden="true" />
                    <span className="text-base">{selectedType ? formatPoiTypeLabel(selectedType) : 'POI platzieren'}</span>
                    <PiCaretDown className={cn('h-5 w-5 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
                  </MenuButton>

                  <MenuItems className="absolute right-0 bottom-full left-0 z-50 mb-2 max-h-72 origin-bottom overflow-y-auto rounded-lg border border-border-subtle bg-surface-panel p-1 shadow-xl transition focus-visible:outline-none">
                    {/* Alle POI-Typen (häufig + erweitert) auf Mobile */}
                    {[...frequentTypes, ...extendedTypes].map((type) => {
                      const isActive = selectedType === type;

                      return (
                        <MenuItem key={type}>
                          {({ focus }) => (
                            <div
                              className={cn(
                                'rounded-md transition-colors',
                                // Focus state (keyboard navigation)
                                focus && 'bg-action-secondary',
                              )}
                            >
                              <PoiTypeButton
                                type={type}
                                onClick={handlePoiTypeSelect}
                                isActive={isActive}
                                size="md"
                                iconSize={24}
                                fullWidth
                                showFocusState={focus}
                                className={cn(
                                  'text-base font-medium',
                                  // Override default hover scale for dropdown items
                                  'hover:scale-100',
                                  'px-4 py-3',
                                )}
                              />
                            </div>
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
