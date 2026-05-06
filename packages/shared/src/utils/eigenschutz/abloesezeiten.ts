/**
 * Kürzt einen Ablösezeiten-Freitext für die Tooltip-Anzeige auf der Karte.
 * Whitespace (inkl. Zeilenumbrüche) wird zu einem Leerzeichen kollabiert.
 * Bei Überlänge wird auf maxChars-1 abgeschnitten und ein „…" angehängt.
 *
 * Vorbereitet für Story 4.3 (MapGL-Marker-Tooltip). Story 4.2 konsumiert
 * die Utility nicht im Render-Pfad.
 *
 * @param text   Roher Ablösezeiten-Freitext (kann `null`/`undefined` sein,
 *               wenn das Feld leer gelassen wurde).
 * @param maxChars Maximale Zeichenzahl der Rückgabe inkl. Ellipsen-Suffix
 *                 (Standard: 120).
 * @returns Whitespace-normalisierten Text; bei Überlänge gekürzt mit
 *          „…"-Suffix. Leerer/leerer Eingabe-Wert ergibt Leerstring.
 */
export function truncateAbloesezeitenForTooltip(text: string | null | undefined, maxChars = 120): string {
  if (!text) return '';
  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, maxChars - 1).trimEnd()}…`;
}
