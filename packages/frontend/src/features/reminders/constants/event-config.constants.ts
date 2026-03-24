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
    bgColor: 'bg-status-info-surface',
    textColor: 'text-status-info-text',
    label: 'Erstellt',
  },
  ErinnerungAusgeloest: {
    icon: PiAlarm,
    bgColor: 'bg-status-danger-surface',
    textColor: 'text-status-danger-text',
    label: 'Ausgelöst',
  },
  ErinnerungRetriggered: {
    icon: PiAlarm,
    bgColor: 'bg-status-warning-surface',
    textColor: 'text-status-warning-text',
    label: 'Erneut ausgelöst',
  },
  ErinnerungAcknowledged: {
    icon: PiCheck,
    bgColor: 'bg-status-success-surface',
    textColor: 'text-status-success-text',
    label: 'Bestätigt',
  },
  ErinnerungSnoozed: {
    icon: PiClock,
    bgColor: 'bg-action-secondary',
    textColor: 'text-action-primary',
    label: 'Verschoben',
  },
  ErinnerungEskaliert: {
    icon: PiWarning,
    bgColor: 'bg-status-danger-surface',
    textColor: 'text-status-danger-text',
    label: 'Eskaliert',
  },
  ErinnerungIntensiviert: {
    icon: PiWarning,
    bgColor: 'bg-status-danger-surface',
    textColor: 'text-status-danger-text',
    label: 'Intensiviert',
  },
  ErinnerungErledigt: {
    icon: PiCheckCircle,
    bgColor: 'bg-status-success-surface',
    textColor: 'text-status-success-text',
    label: 'Erledigt',
  },
  ErinnerungAssigned: {
    icon: PiUser,
    bgColor: 'bg-action-secondary',
    textColor: 'text-action-primary',
    label: 'Zugewiesen',
  },
  ErinnerungAktualisiert: {
    icon: PiPencilSimple,
    bgColor: 'bg-surface-raised',
    textColor: 'text-text-secondary',
    label: 'Aktualisiert',
  },
  ErinnerungGeloescht: {
    icon: PiTrash,
    bgColor: 'bg-surface-raised',
    textColor: 'text-text-muted',
    label: 'Gelöscht',
  },
  // Story 5.7: Original-ETB-Eintrag (von dem aus die Erinnerung erstellt wurde)
  UrsprungsEintrag: {
    icon: PiFileText,
    bgColor: 'bg-status-info-surface',
    textColor: 'text-status-info-text',
    label: 'Ursprung',
  },
};

/**
 * Default Event-Konfiguration für unbekannte Event-Typen
 */
const DEFAULT_EVENT_CONFIG: EventConfig = {
  icon: PiBellSimple,
  bgColor: 'bg-surface-raised',
  textColor: 'text-text-secondary',
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
