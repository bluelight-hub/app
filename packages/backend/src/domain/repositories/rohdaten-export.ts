/**
 * Domain Interface fuer Rohdaten-Export einer Erinnerung.
 * Wird vom Repository befuellt und von den Export-Services konsumiert.
 * Story 9.10: Alle 25 Felder inkl. User-Name-Aufloesung.
 */
export interface RohdatenExportItem {
  // Basis
  id: string;
  titel: string;
  beschreibung: string;
  status: string;
  kategorieName: string | null;

  // Ersteller
  erstelltVonName: string;
  createdAt: Date;

  // Faelligkeit & Ausloesung
  faelligAm: Date;
  ausgeloestAm: Date | null;

  // Acknowledgment
  acknowledgedAm: Date | null;
  acknowledgedByName: string | null;

  // Snooze
  snoozedAt: Date | null;
  snoozedByName: string | null;
  snoozedUntil: Date | null;
  snoozeCount: number;

  // Erledigung
  erledigtAm: Date | null;
  erledigtByName: string | null;
  erledigungsNotiz: string | null;

  // Zuweisung
  assignedToName: string | null;
  assignedByName: string | null;
  assignedAt: Date | null;

  // Eskalation
  wurdeEskaliert: boolean;
  eskaliertAm: Date | null;
  eskalationsPersonName: string | null;
  previousAssigneeName: string | null;
}
