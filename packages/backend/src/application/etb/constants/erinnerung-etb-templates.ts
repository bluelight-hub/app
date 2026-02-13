/**
 * ETB-Text-Templates für Erinnerungs-Events.
 *
 * Diese Templates definieren die Textformate für automatisch erstellte
 * ETB-Eintraege bei Erinnerungs-Lifecycle-Events.
 *
 * **Platzhalter-Syntax:**
 * - `{titel}` - Titel der Erinnerung
 * - `{faelligAm}` - Fälligkeitszeitpunkt (formatiert)
 * - `{person}` - Name/ID der relevanten Person
 * - `{dauer}` - Snooze-Dauer
 * - `{notiz}` - Erledigungsnotiz
 * - `{stufe}` - Intensivierungsstufe
 *
 * **Story 5.0:** Templates vorbereitet für Story 5.1 Implementierung.
 *
 * @module application/etb/constants
 */

/**
 * ETB-Text-Templates für alle 11 Erinnerungs-Events.
 *
 * Die Templates folgen dem Pattern:
 * "Erinnerung '[titel]' [aktion] [optionale Details]"
 */
export const ERINNERUNG_ETB_TEMPLATES = {
  /** Template für ErinnerungErstelltEvent */
  ERSTELLT: "Erinnerung '{titel}' erstellt, fällig um {faelligAm}",

  /** Template für ErinnerungAusgeloestEvent */
  AUSGELOEST: "Erinnerung '{titel}' ausgelöst",

  /** Template für ErinnerungAcknowledgedEvent */
  ACKNOWLEDGED: "Erinnerung '{titel}' bestätigt von {person}",

  /** Template für ErinnerungSnoozedEvent */
  SNOOZED: "Erinnerung '{titel}' verschoben um {dauer}",

  /** Template für ErinnerungRetriggeredEvent */
  RETRIGGERED: "Erinnerung '{titel}' erneut ausgelöst",

  /** Template für ErinnerungErledigtEvent */
  ERLEDIGT: "Erinnerung '{titel}' erledigt: {notiz}",

  /** Template für ErinnerungAssignedEvent */
  ASSIGNED: "Erinnerung '{titel}' zugewiesen an {person}",

  /** Template für ErinnerungEskaliertEvent */
  ESKALIERT: "Erinnerung '{titel}' eskaliert an {person}",

  /** Template für ErinnerungIntensiviertEvent */
  INTENSIVIERT: "Erinnerung '{titel}' intensiviert (Stufe {stufe})",

  /** Template für ErinnerungAktualisiertEvent */
  AKTUALISIERT: "Erinnerung '{titel}' aktualisiert",

  /** Template für ErinnerungGeloeschtEvent */
  GELOESCHT: "Erinnerung '{titel}' gelöscht",
} as const;

/**
 * Type für die Template-Keys.
 * Ermöglicht Type-Safe Zugriff auf Templates.
 */
export type ErinnerungEtbTemplateKey = keyof typeof ERINNERUNG_ETB_TEMPLATES;

/**
 * Type für Template-Werte.
 */
export type ErinnerungEtbTemplateValue = (typeof ERINNERUNG_ETB_TEMPLATES)[ErinnerungEtbTemplateKey];
