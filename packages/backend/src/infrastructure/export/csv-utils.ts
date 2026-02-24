/**
 * Gemeinsame CSV-Utility-Funktionen fuer Export-Services.
 *
 * Enthaelt Konstanten und Hilfsfunktionen die von allen CSV-Export-Services
 * wiederverwendet werden (BefehlCsvService, CsvExportService, etc.).
 */

/** Byte Order Mark fuer korrekte UTF-8 Erkennung in Excel */
export const CSV_BOM = '\uFEFF';

/** Semikolon als Trennzeichen (deutsche Excel-Versionen) */
export const CSV_SEPARATOR = ';';

/** Zeichen die am Anfang eines Feldes Formel-Injection ausloesen koennen */
const FORMULA_STARTERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Escaped ein CSV-Feld sicher fuer Excel/LibreOffice.
 *
 * Schuetzt gegen:
 * - Felder mit Trennzeichen, Zeilenumbruch oder Anfuehrungszeichen (RFC 4180)
 * - CSV Formula-Injection: Felder die mit =, +, -, @, Tab, CR beginnen
 *   werden in Anfuehrungszeichen gewrappt (Excel fuehrt keine Formeln
 *   innerhalb von Quoted Fields aus)
 *
 * @param field - Das zu escapende Feld
 * @param separator - Trennzeichen (default: Semikolon)
 * @returns Sicher escapedes Feld
 */
export function escapeCsvField(field: string, separator = CSV_SEPARATOR): string {
  const needsQuoting = FORMULA_STARTERS.some((c) => field.startsWith(c)) || field.includes(separator) || field.includes('\n') || field.includes('\r') || field.includes('"');

  if (needsQuoting) {
    return `"${field.replace(/"/g, '""')}"`;
  }

  return field;
}
