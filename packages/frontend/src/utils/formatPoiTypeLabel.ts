import type { PoiType } from './poi-icons';

/**
 * Formatiert POI-Typ zu lesbarem Label
 *
 * Konvertiert einen POI-Typ aus dem Format "EINSATZ_ORT" in "Einsatz Ort"
 * für die Anzeige in der Benutzeroberfläche.
 *
 * @param type - POI-Typ (z.B. "EINSATZORT", "GEFAHREN_QUELLE")
 * @returns Formatiertes Label mit kapitalisiertem ersten Buchstaben und Leerzeichen statt Unterstrichen
 *
 * @example
 * ```typescript
 * formatPoiTypeLabel('EINSATZORT'); // "Einsatzort"
 * formatPoiTypeLabel('GEFAHREN_QUELLE'); // "Gefahren Quelle"
 * ```
 */
export const formatPoiTypeLabel = (type: PoiType): string => {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
