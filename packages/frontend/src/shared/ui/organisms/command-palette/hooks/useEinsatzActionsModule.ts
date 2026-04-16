import { useMemo } from 'react';
import { PiLightning, PiSpeakerHigh, PiUserPlus, PiWarning } from 'react-icons/pi';
import type { ModuleConfig } from '../types';

/**
 * Parameter für `useEinsatzActionsModule`.
 */
export interface UseEinsatzActionsModuleParams {
  /** Öffnet den Audio-Einstellungen-Dialog. */
  onOpenAudioDialog: () => void;
  /** Öffnet den Dialog zum Einladen Externer. */
  onOpenExterneEinladenDialog: () => void;
  /** Öffnet die Bestätigung „Einsatz beenden". */
  onOpenEndConfirmation: () => void;
  /** true, wenn der Nutzer eine Führungsrolle im Einsatz hat. */
  isFuehrungskraft: boolean;
  /** true, solange der Einsatz noch beendet werden kann (nicht bereits abgeschlossen/archiviert). */
  canEndEinsatz: boolean;
}

/**
 * Command-Palette-Modul „Einsatz-Aktionen".
 *
 * Ersetzt die bisherigen Sekundär-Quickactions aus der Sidebar
 * (Audio-Einstellungen, Externe einladen, Einsatz beenden) durch Einträge
 * in der Command Palette. Dialog-State bleibt beim aufrufenden Layout
 * (`SingleEinsatzLayout`) – dieses Hook nimmt lediglich die Setter als
 * Callbacks entgegen und ruft sie aus der Palette heraus auf.
 *
 * Sichtbarkeitslogik:
 * - „Externe einladen" wird nur für Führungskräfte angeboten.
 * - „Einsatz beenden" ist disabled, sobald der Einsatz abgeschlossen oder
 *   archiviert ist (steuerbar über `canEndEinsatz`).
 */
export function useEinsatzActionsModule(params: UseEinsatzActionsModuleParams): ModuleConfig {
  const { onOpenAudioDialog, onOpenExterneEinladenDialog, onOpenEndConfirmation, isFuehrungskraft, canEndEinsatz } = params;

  return useMemo<ModuleConfig>(
    () => ({
      id: 'einsatz-actions',
      name: 'Einsatz-Aktionen',
      color: 'orange',
      icon: PiLightning,
      subPages: [
        {
          id: 'einsatz-audio-settings',
          name: 'Audio-Einstellungen',
          icon: PiSpeakerHigh,
          description: 'Benachrichtigungstöne und Lautstärke',
          action: () => onOpenAudioDialog(),
        },
        ...(isFuehrungskraft
          ? [
              {
                id: 'einsatz-externe-einladen',
                name: 'Externe einladen',
                icon: PiUserPlus,
                description: 'Gastzugang für externe Teilnehmer erstellen',
                action: () => onOpenExterneEinladenDialog(),
              },
            ]
          : []),
        {
          id: 'einsatz-beenden',
          name: 'Einsatz beenden',
          icon: PiWarning,
          destructive: true,
          disabled: !canEndEinsatz,
          disabledReason: !canEndEinsatz ? 'Einsatz bereits abgeschlossen oder archiviert' : undefined,
          action: () => onOpenEndConfirmation(),
        },
      ],
    }),
    [onOpenAudioDialog, onOpenExterneEinladenDialog, onOpenEndConfirmation, isFuehrungskraft, canEndEinsatz],
  );
}
