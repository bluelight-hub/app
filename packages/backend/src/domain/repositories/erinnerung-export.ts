/**
 * Domain Interface fuer Export-Daten einer Erinnerung.
 * Wird vom Repository befuellt und von den Export-Services konsumiert.
 */
export interface ErinnerungExportItem {
  id: string;
  titel: string;
  beschreibung: string;
  status: string;
  erstelltVonName: string;
  assignedToName: string | null;
  kategorieName: string | null;
  faelligAm: Date;
  ausgeloestAm: Date | null;
  acknowledgedAm: Date | null;
  erledigtAm: Date | null;
  eskaliertAm: Date | null;
  wurdeEskaliert: boolean;
  snoozeCount: number;
  createdAt: Date;
}
