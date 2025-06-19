/**
 * Utility-Funktionen für Sortierung
 */

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  field: keyof T | string;
  direction: SortDirection;
  customCompare?: (a: T, b: T) => number;
}

/**
 * Generische Sortierfunktion für Arrays
 * @param data Das zu sortierende Array
 * @param config Die Sortier-Konfiguration
 * @returns Das sortierte Array (neues Array)
 */
export function sortData<T>(data: T[], config: SortConfig<T>): T[] {
  return [...data].sort((a, b) => {
    if (config.customCompare) {
      const result = config.customCompare(a, b);
      return config.direction === 'desc' ? -result : result;
    }

    const aValue = getNestedValue(a, config.field as string);
    const bValue = getNestedValue(b, config.field as string);

    return compareValues(aValue, bValue, config.direction);
  });
}

/**
 * Vergleicht zwei Werte unter Berücksichtigung des Typs
 * @param a Erster Wert
 * @param b Zweiter Wert
 * @param direction Sortierrichtung
 * @returns -1, 0 oder 1 für die Sortierung
 */
export function compareValues(a: any, b: any, direction: SortDirection): number {
  // Handle null/undefined
  if (a == null && b == null) return 0;
  if (a == null) return direction === 'asc' ? 1 : -1;
  if (b == null) return direction === 'asc' ? -1 : 1;

  // Dates
  if (a instanceof Date && b instanceof Date) {
    const result = a.getTime() - b.getTime();
    return direction === 'asc' ? result : -result;
  }

  // Numbers
  if (typeof a === 'number' && typeof b === 'number') {
    const result = a - b;
    return direction === 'asc' ? result : -result;
  }

  // Strings (case-insensitive)
  if (typeof a === 'string' && typeof b === 'string') {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower < bLower) return direction === 'asc' ? -1 : 1;
    if (aLower > bLower) return direction === 'asc' ? 1 : -1;
    return 0;
  }

  // Booleans
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    if (a === b) return 0;
    return direction === 'asc' ? (a ? 1 : -1) : a ? -1 : 1;
  }

  // Default: convert to string and compare
  const aStr = String(a);
  const bStr = String(b);
  if (aStr < bStr) return direction === 'asc' ? -1 : 1;
  if (aStr > bStr) return direction === 'asc' ? 1 : -1;
  return 0;
}

/**
 * Holt einen verschachtelten Wert aus einem Objekt
 * @param obj Das Objekt
 * @param path Der Pfad zum Wert (z.B. "user.profile.name")
 * @returns Der Wert oder undefined
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}

/**
 * Erstellt eine Mehrfach-Sortierfunktion
 * @param configs Array von Sortier-Konfigurationen (in Prioritätsreihenfolge)
 * @returns Vergleichsfunktion für Array.sort()
 */
export function createMultiSort<T>(configs: SortConfig<T>[]): (a: T, b: T) => number {
  return (a: T, b: T) => {
    for (const config of configs) {
      const result = config.customCompare
        ? config.customCompare(a, b)
        : compareValues(
            getNestedValue(a, config.field as string),
            getNestedValue(b, config.field as string),
            'asc', // Immer aufsteigend, direction wird später angewendet
          );

      if (result !== 0) {
        return config.direction === 'desc' ? -result : result;
      }
    }
    return 0;
  };
}

/**
 * Toggle die Sortierrichtung
 * @param current Die aktuelle Richtung
 * @returns Die umgekehrte Richtung
 */
export function toggleSortDirection(current: SortDirection): SortDirection {
  return current === 'asc' ? 'desc' : 'asc';
}

/**
 * Erstellt eine neue Sortier-Konfiguration basierend auf dem aktuellen Zustand
 * @param currentField Das aktuelle Sortierfeld
 * @param currentDirection Die aktuelle Sortierrichtung
 * @param newField Das neue Sortierfeld
 * @param defaultDirection Die Standard-Richtung für neue Felder
 * @returns Die neue Sortier-Konfiguration
 */
export function getNextSortConfig<T>(
  currentField: keyof T | string | null,
  currentDirection: SortDirection,
  newField: keyof T | string,
  defaultDirection: SortDirection = 'asc',
): SortConfig<T> {
  if (currentField === newField) {
    // Gleiches Feld: Richtung umkehren
    return {
      field: newField,
      direction: toggleSortDirection(currentDirection),
    };
  } else {
    // Neues Feld: Standard-Richtung verwenden
    return {
      field: newField,
      direction: defaultDirection,
    };
  }
}

/**
 * Sortiert Daten nach mehreren Feldern
 * @param data Das zu sortierende Array
 * @param primaryConfig Primäre Sortierung
 * @param secondaryConfig Sekundäre Sortierung (optional)
 * @returns Das sortierte Array
 */
export function sortByMultipleFields<T>(
  data: T[],
  primaryConfig: SortConfig<T>,
  secondaryConfig?: SortConfig<T>,
): T[] {
  const configs = secondaryConfig ? [primaryConfig, secondaryConfig] : [primaryConfig];

  return [...data].sort(createMultiSort(configs));
}
