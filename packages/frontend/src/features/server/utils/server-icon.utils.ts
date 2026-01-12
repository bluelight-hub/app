/**
 * Server Icon Utility Functions
 *
 * Hilfsfunktionen für die Arbeit mit Server-Icons.
 * Bietet Validierung, Lookup und Fallback-Funktionalität.
 *
 * @module features/server/utils/server-icon
 */

import { SERVER_ICON_PRESETS, DEFAULT_SERVER_ICON, type ServerIconComponent, type ServerIconPreset, type ServerIconValue } from '../constants/server-icons';

// Re-export types for external use
export type { ServerIconValue };

/**
 * Icon-Lookup Map für O(1) Zugriff
 *
 * Cached Map von Icon-Value zu Preset für schnellen Zugriff.
 */
const iconPresetMap = new Map<string, ServerIconPreset>(SERVER_ICON_PRESETS.map((preset) => [preset.value, preset]));

/**
 * Set aller gültigen Icon-Werte für schnelle Validierung
 */
const validIconValues = new Set<string>(SERVER_ICON_PRESETS.map((preset) => preset.value));

/**
 * Prüft ob ein Icon-Wert gültig ist
 *
 * Validiert ob der übergebene String einem der definierten
 * Server-Icon-Presets entspricht.
 *
 * @param icon - Der zu prüfende Icon-Wert
 * @returns true wenn das Icon gültig ist, sonst false
 *
 * @example
 * ```ts
 * isValidServerIcon('building') // true
 * isValidServerIcon('unknown')  // false
 * isValidServerIcon('')         // false
 * ```
 */
export function isValidServerIcon(icon: string): icon is ServerIconValue {
  return validIconValues.has(icon);
}

/**
 * Gibt das React Component für ein Icon zurück
 *
 * Sucht das passende Phosphor Icon-Component für den übergebenen Icon-Wert.
 * Gibt undefined zurück wenn das Icon nicht gefunden wird.
 *
 * @param icon - Der Icon-Wert (z.B. 'building', 'shield')
 * @returns Das React Component oder undefined
 *
 * @example
 * ```tsx
 * const Icon = getServerIconComponent('building');
 * if (Icon) {
 *   return <Icon className="size-6" />;
 * }
 * ```
 */
export function getServerIconComponent(icon: string): ServerIconComponent | undefined {
  return iconPresetMap.get(icon)?.icon;
}

/**
 * Gibt das Default-Icon zurück
 *
 * Liefert das PiHardDrives Icon als Fallback für ungültige oder
 * fehlende Icon-Werte.
 *
 * @returns Das Standard Server-Icon Component
 *
 * @example
 * ```tsx
 * const Icon = getServerIconComponent(icon) ?? getDefaultServerIcon();
 * return <Icon className="size-6" />;
 * ```
 */
export function getDefaultServerIcon(): ServerIconComponent {
  // V4: Defensive check statt unsafe non-null assertion
  const preset = iconPresetMap.get(DEFAULT_SERVER_ICON);
  if (!preset) {
    throw new Error(`Critical: Default icon "${DEFAULT_SERVER_ICON}" not found in presets.`);
  }
  return preset.icon;
}

/**
 * Gibt den deutschen Namen für ein Icon zurück
 *
 * Sucht den lokalisierten Anzeigenamen für den übergebenen Icon-Wert.
 * Gibt undefined zurück wenn das Icon nicht gefunden wird.
 *
 * @param icon - Der Icon-Wert (z.B. 'building', 'shield')
 * @returns Der deutsche Name oder undefined
 *
 * @example
 * ```ts
 * getServerIconName('building') // 'Gebäude'
 * getServerIconName('unknown')  // undefined
 * ```
 */
export function getServerIconName(icon: string): string | undefined {
  return iconPresetMap.get(icon)?.name;
}

/**
 * Gibt das vollständige Icon-Preset zurück
 *
 * Sucht das komplette Preset-Objekt für den übergebenen Icon-Wert.
 * Nützlich wenn sowohl Name als auch Component benötigt werden.
 *
 * @param icon - Der Icon-Wert (z.B. 'building', 'shield')
 * @returns Das vollständige Preset oder undefined
 *
 * @example
 * ```tsx
 * const preset = getServerIconPreset('building');
 * if (preset) {
 *   console.log(preset.name);  // 'Gebäude'
 *   console.log(preset.value); // 'building'
 *   return <preset.icon className="size-6" />;
 * }
 * ```
 */
export function getServerIconPreset(icon: string): ServerIconPreset | undefined {
  return iconPresetMap.get(icon);
}
