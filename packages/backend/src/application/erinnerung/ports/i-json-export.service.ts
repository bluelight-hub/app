import type { ErinnerungExportItem } from '@domain/repositories/erinnerung-export';
import type { RohdatenExportItem } from '@domain/repositories/rohdaten-export';

/**
 * Port-Interface fuer JSON-Export-Generierung.
 *
 * Wird vom Application Layer definiert und vom Infrastructure Layer implementiert.
 * Ermoeglicht Dependency Inversion: Handler haengen von Abstraktion (Port) ab,
 * nicht von konkreter Implementierung (JsonExportService).
 */
export interface IJsonExportService {
  /** Generiert einen JSON-Export aller Erinnerungen. */
  generateExport(erinnerungen: ErinnerungExportItem[]): Buffer;

  /** Generiert einen JSON-Export aller Rohdaten-Felder. */
  generateRawExport(items: RohdatenExportItem[]): Buffer;
}
