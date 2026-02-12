import type { ErinnerungExportItem } from '@domain/repositories/erinnerung-export';
import type { ErinnerungStatistikDto } from '../dto/erinnerung-statistik.dto';
import type { PersonStatistikDto } from '../dto/person-statistik.dto';
import type { EskalationsAnalyseDto } from '../dto/eskalations-analyse.dto';
import type { ReaktionszeitStatistikDto } from '../dto/reaktionszeit-statistik.dto';

/**
 * Port-Interface fuer PDF-Export-Generierung.
 *
 * Wird vom Application Layer definiert und vom Infrastructure Layer implementiert.
 * Ermoeglicht Dependency Inversion: Handler haengen von Abstraktion (Port) ab,
 * nicht von konkreter Implementierung (PdfExportService).
 */
export interface IPdfExportService {
  /**
   * Generiert einen PDF-Export mit Zusammenfassung, Detail-Statistiken
   * und der vollstaendigen Erinnerungsliste.
   */
  generateExport(
    statistik: ErinnerungStatistikDto,
    personStatistik: PersonStatistikDto,
    eskalationsAnalyse: EskalationsAnalyseDto,
    reaktionszeiten: ReaktionszeitStatistikDto,
    erinnerungen: ErinnerungExportItem[],
    einsatzNummer: string,
  ): Promise<Buffer>;
}
