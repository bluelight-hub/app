import type { ErinnerungExportItem } from '@domain/repositories/erinnerung-export';
import type { RohdatenExportItem } from '@domain/repositories/rohdaten-export';

/**
 * Port-Interface fuer CSV-Export-Generierung.
 *
 * Wird vom Application Layer definiert und vom Infrastructure Layer implementiert.
 * Ermoeglicht Dependency Inversion: Handler haengen von Abstraktion (Port) ab,
 * nicht von konkreter Implementierung (CsvExportService).
 */
export interface ICsvExportService {
  /** Generiert einen CSV-Export aller Erinnerungen. */
  generateExport(erinnerungen: ErinnerungExportItem[]): Buffer;

  /** Generiert einen CSV-Export aller Rohdaten-Felder. */
  generateRawExport(items: RohdatenExportItem[]): Buffer;
}
