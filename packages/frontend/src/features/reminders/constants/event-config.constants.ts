/**
 * Event-Type Konfiguration für Erinnerungen
 *
 * Definiert Icons, Farben und Labels für jeden Event-Typ.
 * Wird sowohl in ErinnerungEtbHistoryWidget als auch in ErinnerungTimelineWidget verwendet.
 *
 * **Story 5.5 & 5.7:** Gemeinsame Konfiguration für Event-Darstellung
 */

import type { IconType } from 'react-icons';
import { PiAlarm, PiBellSimple, PiCheck, PiCheckCircle, PiClock, PiFileText, PiPencilSimple, PiTrash, PiUser, PiWarning } from 'react-icons/pi';

/**
 * Konfiguration für einen Event-Typ
 */
export interface EventConfig {
  icon: IconType;
  bgColor: string;
  textColor: string;
  label: string;
}

/**
 * Event-Type Konfiguration Map
 *
 * Definiert Icons, Farben und Labels für jeden Event-Typ.
 */
export const EVENT_CONFIG: Record<string, EventConfig> = {
  ErinnerungErstellt: {
    icon: PiBellSimple,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    label: 'Erstellt',
  },
  ErinnerungAusgeloest: {
    icon: PiAlarm,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600 dark:text-orange-400',
    label: 'Ausgelöst',
  },
  ErinnerungRetriggered: {
    icon: PiAlarm,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-600 dark:text-amber-400',
    label: 'Erneut ausgelöst',
  },
  ErinnerungAcknowledged: {
    icon: PiCheck,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    label: 'Bestätigt',
  },
  ErinnerungSnoozed: {
    icon: PiClock,
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    label: 'Verschoben',
  },
  ErinnerungEskaliert: {
    icon: PiWarning,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400',
    label: 'Eskaliert',
  },
  ErinnerungIntensiviert: {
    icon: PiWarning,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400',
    label: 'Intensiviert',
  },
  ErinnerungErledigt: {
    icon: PiCheckCircle,
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    label: 'Erledigt',
  },
  ErinnerungAssigned: {
    icon: PiUser,
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    label: 'Zugewiesen',
  },
  ErinnerungAktualisiert: {
    icon: PiPencilSimple,
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    textColor: 'text-gray-600 dark:text-gray-400',
    label: 'Aktualisiert',
  },
  ErinnerungGeloescht: {
    icon: PiTrash,
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    textColor: 'text-gray-500 dark:text-gray-500',
    label: 'Gelöscht',
  },
  // Story 5.7: Original-ETB-Eintrag (von dem aus die Erinnerung erstellt wurde)
  UrsprungsEintrag: {
    icon: PiFileText,
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    label: 'Ursprung',
  },
};

/**
 * Default Event-Konfiguration für unbekannte Event-Typen
 */
const DEFAULT_EVENT_CONFIG: EventConfig = {
  icon: PiBellSimple,
  bgColor: 'bg-gray-100 dark:bg-gray-700',
  textColor: 'text-gray-600 dark:text-gray-400',
  label: '',
};

/**
 * Holt die Event-Konfiguration für einen Event-Typ
 *
 * @param eventType - Der Event-Typ
 * @returns Die Konfiguration für den Event-Typ oder eine Default-Konfiguration
 */
export function getEventConfig(eventType: string): EventConfig {
  return (
    EVENT_CONFIG[eventType] ?? {
      ...DEFAULT_EVENT_CONFIG,
      label: eventType,
    }
  );
}
