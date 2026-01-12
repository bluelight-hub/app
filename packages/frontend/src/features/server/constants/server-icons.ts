/**
 * Server Icon Presets
 *
 * Definiert die verfügbaren Icons für Server-Konfigurationen.
 * Verwendet Phosphor Icons (react-icons/pi) für konsistentes UI-Design.
 *
 * @module features/server/constants/server-icons
 */

import type { ComponentType } from 'react';
import type { IconBaseProps } from 'react-icons';
import { PiBuildingOffice, PiShieldCheck, PiStar, PiMapPin, PiHardDrives, PiHouse, PiGraduationCap, PiHeart } from 'react-icons/pi';

/**
 * Phosphor Icon Props Typ
 *
 * Standard-Props für Phosphor Icons aus react-icons.
 */
export type ServerIconProps = IconBaseProps;

/**
 * Phosphor Icon Component Typ
 *
 * Typdefinition für Phosphor Icon React-Komponenten.
 */
export type ServerIconComponent = ComponentType<ServerIconProps>;

/**
 * Erlaubte Icon-Werte
 *
 * Union Type aller gültigen Icon-Schlüssel für Type Safety.
 */
export type ServerIconValue = 'building' | 'shield' | 'star' | 'pin' | 'server' | 'home' | 'academic' | 'heart';

/**
 * Server Icon Preset Interface
 *
 * Definiert die Struktur eines Icon-Presets mit
 * deutschem Namen, Schlüssel und React-Komponente.
 */
export interface ServerIconPreset {
  /** Deutscher Anzeigename für das Icon */
  name: string;
  /** Eindeutiger Schlüssel für das Icon */
  value: ServerIconValue;
  /** Phosphor Icon React-Komponente */
  icon: ServerIconComponent;
}

/**
 * Verfügbare Server-Icon-Presets
 *
 * Liste aller vordefinierten Icons für Server-Konfigurationen.
 * Die Icons sind semantisch nach typischen Einsatzszenarien benannt:
 *
 * - Gebäude: Behörden, Firmen, Institutionen
 * - Schild: Sicherheitsdienste, Polizei
 * - Stern: Favoriten, Haupt-Server
 * - Pin: Standort-basierte Server
 * - Server: Technische Server, Standard
 * - Haus: Heimserver, lokale Installationen
 * - Akademie: Schulungen, Bildungseinrichtungen
 * - Herz: Medizinische Einrichtungen, Rettungsdienste
 *
 * @example
 * ```tsx
 * // Verwendung in einer Komponente
 * const IconComponent = SERVER_ICON_PRESETS.find(p => p.value === 'building')?.icon;
 * if (IconComponent) {
 *   return <IconComponent className="size-6" />;
 * }
 * ```
 */
// V5: satisfies Type Constraint für bessere Type Safety
export const SERVER_ICON_PRESETS = [
  { name: 'Gebäude', value: 'building', icon: PiBuildingOffice },
  { name: 'Schild', value: 'shield', icon: PiShieldCheck },
  { name: 'Stern', value: 'star', icon: PiStar },
  { name: 'Pin', value: 'pin', icon: PiMapPin },
  { name: 'Server', value: 'server', icon: PiHardDrives },
  { name: 'Haus', value: 'home', icon: PiHouse },
  { name: 'Akademie', value: 'academic', icon: PiGraduationCap },
  { name: 'Herz', value: 'heart', icon: PiHeart },
] as const satisfies readonly ServerIconPreset[];

/**
 * Default Icon Value
 *
 * Der Standard-Icon-Wert, wenn kein Icon angegeben ist.
 */
export const DEFAULT_SERVER_ICON: ServerIconValue = 'server';
